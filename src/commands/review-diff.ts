import type { Command, CommandGenerator, CommandOptions, Provider } from '../types';
import type { Config } from '../types';
import type { AsyncReturnType } from '../utils/AsyncReturnType';
import type { ModelOptions } from '../providers/base';

import { defaultMaxTokens, loadConfig, loadEnv } from '../config';
import { pack } from 'repomix';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FileError, ProviderError } from '../errors';
import type { BaseModelProvider } from '../providers/base';
import { createProvider } from '../providers/base';
import { loadFileConfigWithOverrides } from '../repomix/repomixConfig';
import {
  getNextAvailableProvider,
  getDefaultModel,
  getProviderInfo,
  getAvailableProviders,
  isProviderAvailable,
} from '../utils/providerAvailability';
import { fetchDocContent } from '../utils/fetch-doc';
import { execAsync } from '../utils/execAsync';

export class ReviewDiffCommand implements Command {
  private config: Config;

  constructor() {
    loadEnv();
    this.config = loadConfig();
  }

  async *execute(query: string, options: CommandOptions): CommandGenerator {
    try {
      const baseBranch = options.base || 'main';

      // Determine the directory to analyze
      const targetDirectory = options.subdir
        ? resolve(process.cwd(), options.subdir)
        : process.cwd();

      // Validate that the target directory exists
      if (options.subdir && !existsSync(targetDirectory)) {
        throw new FileError(`The directory "${targetDirectory}" does not exist.`);
      }

      if (options.subdir) {
        yield `Analyzing subdirectory: ${options.subdir}\n`;
      }

      yield 'Packing repository using Repomix...\n';

      // Get repository snapshot
      const repoContext = await this.getRepoSnapshot(targetDirectory);
      if (repoContext.warning) {
        yield repoContext.warning + '\n';
      }

      // Get git diff
      yield `Computing changes from ${baseBranch}...\n`;
      const gitDiffResult = await this.getGitDiff(baseBranch);
      if (gitDiffResult.warning) {
        yield gitDiffResult.warning + '\n';
      }
      const diffContent = gitDiffResult.diff;

      // Fetch document content if the flag is provided
      let docContent = '';
      if (options?.withDoc && Array.isArray(options.withDoc) && options.withDoc.length > 0) {
        const docContents: string[] = [];
        yield `Fetching and extracting text from ${options.withDoc.length} document(s)...\n`;

        for (const docUrl of options.withDoc) {
          if (typeof docUrl !== 'string' || !docUrl.trim()) {
            yield `Warning: Invalid URL provided in --with-doc: "${docUrl}". Skipping.\n`;
            continue;
          }

          try {
            yield `Fetching from: ${docUrl}...\n`;
            const cleanedText = await fetchDocContent(docUrl, options.debug ?? false);

            if (cleanedText && cleanedText.trim().length > 0) {
              docContents.push(cleanedText);
              yield `Successfully extracted content from: ${docUrl}\n`;
            } else {
              yield `Warning: fetchDocContent returned empty or whitespace-only text for ${docUrl}. Skipping.\n`;
            }
          } catch (fetchExtractError) {
            const errorMessage =
              fetchExtractError instanceof Error
                ? fetchExtractError.message
                : String(fetchExtractError);
            yield `Error during document fetch/extraction for ${docUrl}: ${errorMessage}. Skipping this document.\n`;
          }
        }

        if (docContents.length > 0) {
          docContent = docContents.join('\n\n---\n\n'); // Separator between documents
          yield `Successfully added content from ${docContents.length} document(s) to the context.\n`;
        } else {
          yield `Warning: No content successfully extracted from any provided --with-doc URLs. Proceeding without document context.\n`;
        }
      } else if (options?.withDoc) {
        yield `Warning: --with-doc provided but not in the expected format (array of URLs). Proceeding without document context.\n`;
      }

      // Format the combined output
      const formattedContent = this.formatOutput(repoContext, diffContent, query, baseBranch);

      // Count tokens if needed
      const tokenCount = repoContext.tokenCount;
      if (tokenCount > 200_000) {
        options.tokenCount = tokenCount;
      }

      // Track telemetry for context size
      if (options?.trackTelemetry) {
        // Rough token estimation (4 chars per token)
        const diffTokenEstimate = Math.floor((diffContent?.length || 0) / 4);
        const docTokenEstimate = Math.floor((docContent?.length || 0) / 4);
        const totalContextTokens = tokenCount + diffTokenEstimate + docTokenEstimate;
        options.trackTelemetry({ contextTokens: totalContextTokens });
      }

      // Get provider and execute
      const providerName = options?.provider || this.config.repo?.provider || 'gemini';
      const availableProvidersList = getAvailableProviders()
        .map((p) => p.provider)
        .join(', ');

      if (!getProviderInfo(providerName)) {
        throw new ProviderError(
          `Unrecognized provider: ${providerName}.`,
          `Try one of ${availableProvidersList}`
        );
      }

      // If provider is explicitly specified, try only that provider
      if (options?.provider) {
        if (!isProviderAvailable(options.provider)) {
          throw new ProviderError(
            `Provider ${options.provider} is not available. Please check your API key configuration.`,
            `Try one of ${availableProvidersList}`
          );
        }
        yield* this.tryProvider(
          options.provider as Provider,
          formattedContent,
          options,
          docContent
        );
        return;
      }

      let currentProvider = null;

      const noAvailableProvidersMsg =
        'No suitable AI provider available for review-diff command. Please ensure at least one of the following API keys are set in your ~/.vibe-tools/.env file: GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, PERPLEXITY_API_KEY, MODELBOX_API_KEY.';

      if (this.config.repo?.provider && isProviderAvailable(this.config.repo?.provider)) {
        currentProvider = this.config.repo.provider;
      }

      if (!currentProvider) {
        currentProvider = getNextAvailableProvider('repo');
      }

      if (!currentProvider) {
        throw new ProviderError(noAvailableProvidersMsg);
      }

      while (currentProvider) {
        try {
          yield* this.tryProvider(currentProvider, formattedContent, options, docContent);
          return; // If successful, we're done
        } catch (error) {
          console.error(
            `Provider ${currentProvider} failed:`,
            error instanceof Error ? error.message : error
          );
          yield `Provider ${currentProvider} failed, trying next available provider...\n`;
          currentProvider = getNextAvailableProvider('repo', currentProvider);
        }
      }

      // If we get here, no providers worked
      throw new ProviderError(noAvailableProvidersMsg);
    } catch (error) {
      if (error instanceof FileError || error instanceof ProviderError) {
        yield error.formatUserMessage(options?.debug);
      } else if (error instanceof Error) {
        yield `Error: ${error.message}\n`;
      } else {
        yield 'An unknown error occurred\n';
      }
    }
  }

  private async getRepoSnapshot(
    targetDirectory: string
  ): Promise<{ content: string; tokenCount: number; warning?: string }> {
    const repomixConfig = await loadFileConfigWithOverrides(targetDirectory, {
      output: {
        filePath: '.repomix-output.txt',
      },
    });

    let packResult: AsyncReturnType<typeof pack> | undefined;
    try {
      packResult = await pack([targetDirectory], repomixConfig);
      console.log(
        `Packed repository. ${packResult.totalFiles} files. Approximate size ${packResult.totalTokens} tokens.`
      );
    } catch (error) {
      throw new FileError('Failed to pack repository', error);
    }

    try {
      // Check if Repomix created the output file as expected
      if (!existsSync('.repomix-output.txt')) {
        const warning =
          'Warning: Repomix output file not found after pack operation. Repository context may be missing.';
        writeFileSync('.repomix-output.txt', '');
        return { content: '', tokenCount: 0, warning };
      } else {
        const content = readFileSync('.repomix-output.txt', 'utf-8');
        return { content, tokenCount: packResult?.totalTokens || 0 };
      }
    } catch (error) {
      throw new FileError('Failed to read repository context', error);
    }
  }

  private async getGitDiff(baseBranch: string): Promise<{ diff: string; warning?: string }> {
    try {
      const { stdout } = await execAsync(`git diff ${baseBranch}...HEAD`);
      if (!stdout || stdout.trim() === '') {
        return { diff: '(No changes from ' + baseBranch + ')' };
      }
      return { diff: stdout };
    } catch (error) {
      const warning = `Warning: Could not compute diff from ${baseBranch}: ${error instanceof Error ? error.message : String(error)}`;
      return {
        diff: `(Diff unavailable - not a git repository or branch '${baseBranch}' not found)`,
        warning,
      };
    }
  }

  private formatOutput(
    repoSnapshot: { content: string },
    diffContent: string,
    query: string,
    baseBranch: string
  ): string {
    return `<current-repository>
${repoSnapshot.content}
</current-repository>

<changes base="${baseBranch}">
${diffContent}
</changes>

<query>
${query}
</query>`;
  }

  private async *tryProvider(
    provider: Provider,
    formattedContent: string,
    options: CommandOptions,
    docContent: string
  ): CommandGenerator {
    console.log(`Trying provider: ${provider}`);
    const modelProvider = createProvider(provider);
    const modelName =
      options?.model ||
      this.config.repo?.model ||
      (this.config as Record<string, any>)[provider]?.model ||
      getDefaultModel(provider);

    if (!modelName) {
      throw new ProviderError(`No model specified for ${provider}`);
    }

    yield `Reviewing changes using ${modelName}...\n`;
    try {
      const maxTokens =
        options?.maxTokens ||
        this.config.repo?.maxTokens ||
        (this.config as Record<string, any>)[provider]?.maxTokens ||
        defaultMaxTokens;

      const modelOptions: ModelOptions = {
        model: modelName,
        maxTokens,
        debug: options.debug,
        systemPrompt: `You are an expert code reviewer analyzing repository changes.
          You will be provided with:
          1. The current state of the repository (full context)
          2. A git diff showing what changed from the base branch
          3. A specific query or review request from the user
          ${docContent ? '4. Additional context document from the user' : ''}
          
          Analyze the changes in the context of the full repository and provide a comprehensive review based on the user's query.
          Focus on the changes shown in the diff, but use the full repository context to understand the impact.
          
          Be specific and reference exact file names and line numbers when discussing changes.`,
      };

      let fullPrompt = formattedContent;

      if (docContent) {
        fullPrompt += `\n\nCONTEXT DOCUMENT:\n${docContent}`;
      }

      const response = await modelProvider.executePrompt(fullPrompt, modelOptions);

      // Track prompt/completion token usage
      if ('tokenUsage' in modelProvider && modelProvider.tokenUsage) {
        options?.trackTelemetry?.({
          promptTokens: modelProvider.tokenUsage.promptTokens,
          completionTokens: modelProvider.tokenUsage.completionTokens,
          provider,
          model: modelName,
        });
      } else {
        options?.debug &&
          console.log('[ReviewDiffCommand] tokenUsage not found on provider instance.');
        options?.trackTelemetry?.({
          provider,
          model: modelName,
        });
      }

      yield response;
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown error during analysis',
        error
      );
    }
  }
}

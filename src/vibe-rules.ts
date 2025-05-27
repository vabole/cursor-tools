import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { Config } from './types';
import { promises as fs } from 'node:fs';
import { getCurrentVersion } from './utils/versionUtils';

export const VIBE_TOOLS_RULES_VERSION = getCurrentVersion();

// The core vibe-tools content to be included in all templates
export const VIBE_TOOLS_CORE_CONTENT = `# Instructions
Use the following commands to get AI assistance:

**Direct Model Queries:**
\`vibe-tools ask "<your question>" --provider <provider> --model <model>\` - Ask any model from any provider a direct question (e.g., \`vibe-tools ask "What is the capital of France?" --provider openai --model o3-mini\`). Note that this command is generally less useful than other commands like \`repo\` or \`plan\` because it does not include any context from your codebase or repository. In general you should not use the ask command because it does not include any context. The other commands like \`web\`, \`doc\`, \`repo\`, or \`plan\` are usually better. If you are using it, make sure to include in your question all the information and context that the model might need to answer usefully.

**Ask Command Options:**
--provider=<provider>: AI provider to use (openai, anthropic, perplexity, gemini, modelbox, openrouter, or xai)
--model=<model>: Model to use (required for the ask command)
--reasoning-effort=<low|medium|high>: Control the depth of reasoning for supported models (OpenAI o1/o3-mini models and Claude 4 Sonnet). Higher values produce more thorough responses for complex questions.
--with-doc=<doc_url>: Fetch content from one or more document URLs and include it as context. Can be specified multiple times (e.g., \`--with-doc=<url1> --with-doc=<url2>\`).

**Implementation Planning:**
\`vibe-tools plan "<query>"\` - Generate a focused implementation plan using AI (e.g., \`vibe-tools plan "Add user authentication to the login page"\`)
The plan command uses multiple AI models to:
1. Identify relevant files in your codebase (using Gemini by default)
2. Extract content from those files
3. Generate a detailed implementation plan (using OpenAI o3-mini by default)

**Plan Command Options:**
--fileProvider=<provider>: Provider for file identification (gemini, openai, anthropic, perplexity, modelbox, openrouter, or xai)
--thinkingProvider=<provider>: Provider for plan generation (gemini, openai, anthropic, perplexity, modelbox, openrouter, or xai)
--fileModel=<model>: Model to use for file identification
--thinkingModel=<model>: Model to use for plan generation
--with-doc=<doc_url>: Fetch content from one or more document URLs and include it as context for both file identification and planning. Can be specified multiple times (e.g., \`--with-doc=<url1> --with-doc=<url2>\`).

**Web Search:**
\`vibe-tools web "<your question>"\` - Get answers from the web using a provider that supports web search (e.g., Perplexity models and Gemini Models either directly or from OpenRouter or ModelBox) (e.g., \`vibe-tools web "latest shadcn/ui installation instructions"\`)
Note: web is a smart autonomous agent with access to the internet and an extensive up to date knowledge base. Web is NOT a web search engine. Always ask the agent for what you want using a proper sentence, do not just send it a list of keywords. In your question to web include the context and the goal that you're trying to acheive so that it can help you most effectively.
when using web for complex queries suggest writing the output to a file somewhere like local-research/<query summary>.md.

**IMPORTANT: Do NOT use the \`web\` command for specific URLs.** If a user provides a specific URL (documentation link, GitHub repo, article, etc.), you should always use commands that support the \`--with-doc\` parameter instead, such as \`repo\`, \`plan\`, \`doc\`, or \`ask\`. Using \`--with-doc\` ensures the exact content of the URL is processed correctly and completely.

**Web Command Options:**
--provider=<provider>: AI provider to use (perplexity, gemini, modelbox, or openrouter)

**Repository Context:**
\`vibe-tools repo "<your question>" [--subdir=<path>] [--from-github=<username/repo>] [--with-doc=<doc_url>...]\` - Get context-aware answers about this repository using Google Gemini (e.g., \`vibe-tools repo "explain authentication flow"\`)
Use the optional \`--subdir\` parameter to analyze a specific subdirectory instead of the entire repository (e.g., \`vibe-tools repo "explain the code structure" --subdir=src/components\`). Use the optional \`--from-github\` parameter to analyze a remote GitHub repository without cloning it locally (e.g., \`vibe-tools repo "explain the authentication system" --from-github=username/repo-name\`). Use the optional \`--with-doc\` parameter multiple times to include content from several URLs as additional context (e.g., \`vibe-tools repo "summarize findings" --with-doc=https://example.com/spec1 --with-doc=https://example.com/spec2\`).

**Code Review with Diff:**
\`vibe-tools review-diff "<your review question>" [--base=<branch>] [--subdir=<path>] [--with-doc=<doc_url>]\` - Review code changes by providing both repository context and git diff against a base branch (e.g., \`vibe-tools review-diff "Review my authentication changes for security issues"\`). Use the optional \`--base\` parameter to specify a different base branch (default: main) (e.g., \`vibe-tools review-diff "What are the breaking changes?" --base=release-v2\`). Supports the same options as repo command for subdirectory analysis and document context.

**Documentation Generation:**
\`vibe-tools doc [options] [--with-doc=<doc_url>...]\` - Generate comprehensive documentation for this repository (e.g., \`vibe-tools doc --output docs.md\`). Can incorporate document context from multiple URLs (e.g., \`vibe-tools doc --with-doc=https://example.com/existing-docs --with-doc=https://example.com/new-spec\`).

**YouTube Video Analysis:**
\`vibe-tools youtube "<youtube-url>" [question] [--type=<summary|transcript|plan|review|custom>]\` - Analyze YouTube videos and generate detailed reports (e.g., \`vibe-tools youtube "https://youtu.be/43c-Sm5GMbc" --type=summary\`)
Note: The YouTube command requires a \`GEMINI_API_KEY\` to be set in your environment or .vibe-tools.env file as the GEMINI API is the only interface that supports YouTube analysis.

**GitHub Information:**
\`vibe-tools github pr [number]\` - Get the last 10 PRs, or a specific PR by number (e.g., \`vibe-tools github pr 123\`)
\`vibe-tools github issue [number]\` - Get the last 10 issues, or a specific issue by number (e.g., \`vibe-tools github issue 456\`)

**ClickUp Information:**
\`vibe-tools clickup task <task_id>\` - Get detailed information about a ClickUp task including description, comments, status, assignees, and metadata (e.g., \`vibe-tools clickup task "task_id"\`)

**Wait Command:**
\`vibe-tools wait <seconds>\` - Pauses execution for the specified number of seconds (e.g., \`vibe-tools wait 5\` to wait for 5 seconds).

**Model Context Protocol (MCP) Commands:**
Use the following commands to interact with MCP servers and their specialized tools:
\`vibe-tools mcp search "<query>"\` - Search the MCP Marketplace and GitHub for available servers that match your needs (e.g., \`vibe-tools mcp search "git repository management"\`)
\`vibe-tools mcp run "<query>"\` - Execute MCP server tools using natural language queries (e.g., \`vibe-tools mcp run "list files in the current directory" --provider=openrouter\`). The query must include sufficient information for vibe-tools to determine which server to use, provide plenty of context.

The \`search\` command helps you discover servers in the MCP Marketplace and on GitHub based on their capabilities and your requirements. The \`run\` command automatically selects and executes appropriate tools from these servers based on your natural language queries. If you want to use a specific server include the server name in your query. E.g. \`vibe-tools mcp run "using the mcp-server-sqlite list files in directory --provider=openrouter"\`

**Notes on MCP Commands:**
- MCP commands require \`ANTHROPIC_API_KEY\` or \`OPENROUTER_API_KEY\` to be set in your environment
- By default the \`mcp\` command uses Anthropic, but takes a --provider argument that can be set to 'anthropic' or 'openrouter'
- Results are streamed in real-time for immediate feedback
- Tool calls are automatically cached to prevent redundant operations
- Often the MCP server will not be able to run because environment variables are not set. If this happens ask the user to add the missing environment variables to the cursor tools env file at ~/.vibe-tools/.env

**Stagehand Browser Automation:**
\`vibe-tools browser open <url> [options]\` - Open a URL and capture page content, console logs, and network activity (e.g., \`vibe-tools browser open "https://example.com" --html\`)
\`vibe-tools browser act "<instruction>" --url=<url | 'current'> [options]\` - Execute actions on a webpage using natural language instructions (e.g., \`vibe-tools browser act "Click Login" --url=https://example.com\`)
\`vibe-tools browser observe "<instruction>" --url=<url> [options]\` - Observe interactive elements on a webpage and suggest possible actions (e.g., \`vibe-tools browser observe "interactive elements" --url=https://example.com\`)
\`vibe-tools browser extract "<instruction>" --url=<url> [options]\` - Extract data from a webpage based on natural language instructions (e.g., \`vibe-tools browser extract "product names" --url=https://example.com/products\`)

**Notes on Browser Commands:**
- All browser commands are stateless unless --connect-to is used to connect to a long-lived interactive session. In disconnected mode each command starts with a fresh browser instance and closes it when done.
- When using \`--connect-to\`, special URL values are supported:
  - \`current\`: Use the existing page without reloading
  - \`reload-current\`: Use the existing page and refresh it (useful in development)
  - If working interactively with a user you should always use --url=current unless you specifically want to navigate to a different page. Setting the url to anything else will cause a page refresh loosing current state.
- Multi step workflows involving state or combining multiple actions are supported in the \`act\` command using the pipe (|) separator (e.g., \`vibe-tools browser act "Click Login | Type 'user@example.com' into email | Click Submit" --url=https://example.com\`)
- Video recording is available for all browser commands using the \`--video=<directory>\` option. This will save a video of the entire browser interaction at 1280x720 resolution. The video file will be saved in the specified directory with a timestamp.
- DO NOT ask browser act to "wait" for anything, the wait command is currently disabled in Stagehand.

**Tool Recommendations:**
- \`vibe-tools web\` is best for general web information not specific to the repository. Generally call this without additional arguments.
- \`vibe-tools repo\` is ideal for repository-specific questions, planning, code review and debugging. E.g. \`vibe-tools repo "Review recent changes to command error handling looking for mistakes, omissions and improvements"\`. Generally call this without additional arguments.
- \`vibe-tools review-diff\` is ideal for reviewing code changes with full context. Use when you need to review what has changed against a base branch. E.g. \`vibe-tools review-diff "Review my changes for potential bugs"\` or \`vibe-tools review-diff "Are there any breaking changes?" --base=develop\`.
- \`vibe-tools plan\` is ideal for planning tasks. E.g. \`vibe-tools plan "Adding authentication with social login using Google and Github"\`. Generally call this without additional arguments.
- \`vibe-tools doc\` generates documentation for local or remote repositories.
- \`vibe-tools youtube\` analyzes YouTube videos to generate summaries, transcripts, implementation plans, or custom analyses
- \`vibe-tools browser\` is useful for testing and debugging web apps and uses Stagehand
- \`vibe-tools mcp\` enables interaction with specialized tools through MCP servers (e.g., for Git operations, file system tasks, or custom tools)
- **URLS:** For any specific URL (documentation, article, reference, spec, GitHub repo, etc.), ALWAYS use a command with the \`--with-doc=<url>\` parameter rather than the \`web\` command. Examples: \`vibe-tools repo "How should I implement this feature based on the spec?" --with-doc=https://example.com/spec.pdf\` or \`vibe-tools ask "What does this document say about authentication?" --with-doc=https://example.com/auth-doc.html\`
- When implementing features based on documentation, specifications, or any external content, always use the \`--with-doc=<url>\` flag instead of built-in web search. For example: \`vibe-tools plan "Implement login page according to specs" --with-doc=https://example.com/specs.pdf\` or \`vibe-tools repo "How should I implement this feature?" --with-doc=https://example.com/feature-spec.md\`.
- When a user provides a specific URL for documentation or reference material, always use the \`--with-doc=<url>\` flag with that URL rather than attempting to search for or summarize the content independently. This ensures the exact document is used as context.

**Running Commands:**
1. Use \`vibe-tools <command>\` to execute commands (make sure vibe-tools is installed globally using npm install -g vibe-tools so that it is in your PATH)

**General Command Options (Supported by all commands):**
--provider=<provider>: AI provider to use (openai, anthropic, perplexity, gemini, openrouter, modelbox, or xai). If provider is not specified, the default provider for that task will be used.
--model=<model name>: Specify an alternative AI model to use. If model is not specified, the provider's default model for that task will be used.
--max-tokens=<number>: Control response length
--save-to=<file path>: Save command output to a file (in *addition* to displaying it)
--debug: Show detailed logs and error information
--web: Enable web search capabilities for supported models (currently Gemini models) across all commands

**Repository Command Options:**
--provider=<provider>: AI provider to use (gemini, openai, openrouter, perplexity, modelbox, anthropic, or xai)
--model=<model>: Model to use for repository analysis
--max-tokens=<number>: Maximum tokens for response
--from-github=<GitHub username>/<repository name>[@<branch>]: Analyze a remote GitHub repository without cloning it locally
--subdir=<path>: Analyze a specific subdirectory instead of the entire repository
--with-doc=<doc_url>: Fetch content from one or more document URLs and include it as context. Can be specified multiple times.

**Documentation Command Options:**
--from-github=<GitHub username>/<repository name>[@<branch>]: Generate documentation for a remote GitHub repository
--provider=<provider>: AI provider to use (gemini, openai, openrouter, perplexity, modelbox, anthropic, or xai)
--model=<model>: Model to use for documentation generation
--max-tokens=<number>: Maximum tokens for response
--with-doc=<doc_url>: Fetch content from one or more document URLs and include it as context. Can be specified multiple times.

**YouTube Command Options:**
--type=<summary|transcript|plan|review|custom>: Type of analysis to perform (default: summary)

**GitHub Command Options:**
--from-github=<GitHub username>/<repository name>[@<branch>]: Access PRs/issues from a specific GitHub repository

**Browser Command Options (for 'open', 'act', 'observe', 'extract'):**
--console: Capture browser console logs (enabled by default, use --no-console to disable)
--html: Capture page HTML content (disabled by default)
--network: Capture network activity (enabled by default, use --no-network to disable)
--screenshot=<file path>: Save a screenshot of the page
--timeout=<milliseconds>: Set navigation timeout (default: 120000ms for Stagehand operations, 30000ms for navigation)
--viewport=<width>x<height>: Set viewport size (e.g., 1280x720). When using --connect-to, viewport is only changed if this option is explicitly provided
--headless: Run browser in headless mode (default: true)
--no-headless: Show browser UI (non-headless mode) for debugging
--connect-to=<port>: Connect to existing Chrome instance. Special values: 'current' (use existing page), 'reload-current' (refresh existing page)
--wait=<time:duration or selector:css-selector>: Wait after page load (e.g., 'time:5s', 'selector:#element-id')
--video=<directory>: Save a video recording (1280x720 resolution, timestamped subdirectory). Not available when using --connect-to
--url=<url>: Required for \`act\`, \`observe\`, and \`extract\` commands. Url to navigate to before the main command or one of the special values 'current' (to stay on the current page without navigating or reloading) or 'reload-current' (to reload the current page)
--evaluate=<string>: JavaScript code to execute in the browser before the main command

**Nicknames**
Users can ask for these tools using nicknames
Gemini is a nickname for vibe-tools repo
Perplexity is a nickname for vibe-tools web
Stagehand is a nickname for vibe-tools browser
If people say "ask Gemini" or "ask Perplexity" or "ask Stagehand" they mean to use the \`vibe-tools\` command with the \`repo\`, \`web\`, or \`browser\` commands respectively.

**Xcode Commands:**
\`vibe-tools xcode build [buildPath=<path>] [destination=<destination>]\` - Build Xcode project and report errors.
**Build Command Options:**
--buildPath=<path>: (Optional) Specifies a custom directory for derived build data. Defaults to ./.build/DerivedData.
--destination=<destination>: (Optional) Specifies the destination for building the app (e.g., 'platform=iOS Simulator,name=iPhone 16 Pro'). Defaults to 'platform=iOS Simulator,name=iPhone 16 Pro'.

\`vibe-tools xcode run [destination=<destination>]\` - Build and run the Xcode project on a simulator.
**Run Command Options:**
--destination=<destination>: (Optional) Specifies the destination simulator (e.g., 'platform=iOS Simulator,name=iPhone 16 Pro'). Defaults to 'platform=iOS Simulator,name=iPhone 16 Pro'.

\`vibe-tools xcode lint\` - Run static analysis on the Xcode project to find and fix issues.

**Additional Notes:**
- For detailed information, see \`node_modules/vibe-tools/README.md\` (if installed locally).
- Configuration is in \`vibe-tools.config.json\` (or \`~/.vibe-tools/config.json\`).
- API keys are loaded from \`.vibe-tools.env\` (or \`~/.vibe-tools/.env\`).
- ClickUp commands require a \`CLICKUP_API_TOKEN\` to be set in your \`.vibe-tools.env\` file.
- Available models depend on your configured provider (OpenAI, Anthropic, xAI, etc.) in \`vibe-tools.config.json\`.
- repo has a limit of 2M tokens of context. The context can be reduced by filtering out files in a .repomixignore file.
- problems running browser commands may be because playwright is not installed. Recommend installing playwright globally.
- MCP commands require \`ANTHROPIC_API_KEY\` or \`OPENROUTER_API_KEY\`
- **Remember:** You're part of a team of superhuman expert AIs. Work together to solve complex problems.
- **Repomix Configuration:** You can customize which files are included/excluded during repository analysis by creating a \`repomix.config.json\` file in your project root. This file will be automatically detected by \`repo\`, \`plan\`, and \`doc\` commands.

<!-- vibe-tools-version: ${VIBE_TOOLS_RULES_VERSION} -->`;

// Generate rules for different IDEs
export function generateRules(ide: string): string {
  let header = '';
  if (ide === 'cursor') {
    header += `---
description: Global Rule. This rule should ALWAYS be loaded
globs: *,**/*
alwaysApply: true
---
`;
  }

  // Common intro text for all IDEs
  const introText = `${header}vibe-tools is a CLI tool that allows you to interact with AI models and other tools.
vibe-tools is installed on this machine and it is available to you to execute. You're encouraged to use it.`;

  // All IDEs currently use the same core content structure
  return `${introText}

<vibe-tools Integration>
${VIBE_TOOLS_CORE_CONTENT}
</vibe-tools Integration>`;
}

const VIBE_HOME_DIR = join(homedir(), '.vibe-tools');
const VIBE_HOME_CONFIG_PATH = join(VIBE_HOME_DIR, 'config.json');
const LOCAL_CONFIG_FILENAME = 'vibe-tools.config.json';

// Helper function to determine the correct rule file path (local or global)
export function getRuleFilePath(
  targetDir: string,
  ide: string
): { path: string; updateMethod: 'overwrite' | 'inject' } {
  const ideLower = ide.toLowerCase();
  const isGlobalConfigPresent = existsSync(VIBE_HOME_CONFIG_PATH);

  switch (ideLower) {
    case 'cursor':
      return {
        path: join(targetDir, '.cursor', 'rules', 'vibe-tools.mdc'),
        updateMethod: 'overwrite',
      };
    case 'windsurf':
      return { path: join(targetDir, '.windsurfrules'), updateMethod: 'inject' };
    case 'cline':
    case 'roo': {
      // Handle legacy .clinerules file vs new .clinerules/vibe-tools.md structure
      const legacyPath = join(targetDir, '.clinerules');
      const newDirPath = join(targetDir, '.clinerules');
      const newFilePath = join(newDirPath, 'vibe-tools.md');

      try {
        const stats = statSync(legacyPath);
        if (stats.isFile()) {
          // Legacy file exists, use inject method on the file itself
          return { path: legacyPath, updateMethod: 'inject' };
        } else if (stats.isDirectory()) {
          // Directory exists, use the new path inside it with overwrite
          return { path: newFilePath, updateMethod: 'overwrite' };
        }
        // Exists but is neither file nor directory? Fallback to new path.
      } catch (error: any) {
        // ENOENT means legacy path doesn't exist, safe to use new path
        if (error.code !== 'ENOENT') {
          console.warn(
            `Warning: Error checking legacy .clinerules path: ${error.message}. Falling back to new path.`
          );
        }
        // Fall through to use new path if legacy doesn't exist or other error occurs
      }

      // Default: Legacy file/dir doesn't exist or error occurred, use the new structure/overwrite
      return { path: newFilePath, updateMethod: 'overwrite' };
    }
    case 'claude-code': {
      // Global if global config exists, otherwise local
      const claudePath = isGlobalConfigPresent
        ? join(homedir(), '.claude', 'CLAUDE.md')
        : join(targetDir, 'CLAUDE.md');
      return { path: claudePath, updateMethod: 'inject' };
    }
    case 'codex': {
      // Global (instructions.md) if global config exists, otherwise local (codex.md)
      const codexPath = isGlobalConfigPresent
        ? join(homedir(), '.codex', 'instructions.md')
        : join(targetDir, 'codex.md');
      return { path: codexPath, updateMethod: 'inject' };
    }
    default:
      // Return a default or throw an error for unknown IDEs
      // For now, let's return a local path but this case should ideally be handled
      // earlier (e.g., in updateProjectRulesFile)
      return { path: join(targetDir, `.unknown-ide-rules-${ideLower}`), updateMethod: 'overwrite' };
  }
}

// Added export
export function readConfig(filePath: string): Partial<Config> | null {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch /* (error) */ {
      // console.warn(`Warning: Could not parse config file ${filePath}:`, error);
      return null;
    }
  } else {
    return null;
  }
}

// Added export
export function getConfiguredIde(targetDir: string): string | null {
  const localConfigPath = join(targetDir, LOCAL_CONFIG_FILENAME);
  const localConfig = readConfig(localConfigPath);

  if (localConfig?.ide) {
    return localConfig.ide.toLowerCase();
  }

  const globalConfig = readConfig(VIBE_HOME_CONFIG_PATH);
  if (globalConfig?.ide) {
    return globalConfig.ide.toLowerCase();
  }

  return null; // No IDE configured
}

// Added export
export function checkFileForVibeTag(targetDir: string, ide: string): boolean {
  const { path: ruleFilePath } = getRuleFilePath(targetDir, ide); // Get path using helper

  if (!existsSync(ruleFilePath)) {
    return false;
  }
  try {
    const content = readFileSync(ruleFilePath, 'utf-8');
    return content.includes('<vibe-tools Integration>');
  } catch /* (error) */ {
    // console.warn(`Warning: Could not read file ${ruleFilePath} for tag check:`, error);
    return false;
  }
}

// Added export
export async function updateProjectRulesFile(
  targetDir: string,
  ideToUpdate?: string | null // Optional parameter to specify the IDE
): Promise<{
  updated: boolean;
  path?: string;
  ide?: string | null;
  reason?: 'missing_tag' | 'no_ide_specified' | 'file_not_found' | 'update_failed'; // Added reasons
  error?: Error;
}> {
  // Determine the target IDE: use the provided one or get the configured one
  const effectiveIde = ideToUpdate ?? getConfiguredIde(targetDir);

  if (!effectiveIde) {
    // If no IDE is specified and none is configured, we can't update.
    return { updated: false, reason: 'no_ide_specified' };
  }

  // Determine path and update method using the helper function
  const { path: ruleFilePath, updateMethod } = getRuleFilePath(targetDir, effectiveIde);

  // Handle case where getRuleFilePath returned a default for an unknown IDE
  // This check might be redundant if effectiveIde validation is robust earlier
  if (ruleFilePath.includes('.unknown-ide-rules-')) {
    return { updated: false, ide: effectiveIde, reason: 'no_ide_specified' };
  }

  // Generate rules for the target IDE - Ensure VIBE_TOOLS_RULES_VERSION is available
  const rulesContent = generateRules(effectiveIde);

  try {
    if (updateMethod === 'overwrite') {
      // Ensure directory exists for cursor/cline/roo
      if (['cursor', 'cline', 'roo'].includes(effectiveIde.toLowerCase())) {
        const dir = dirname(ruleFilePath);
        await fs.mkdir(dir, { recursive: true });
      }
      // Overwrite the file
      await fs.writeFile(ruleFilePath, rulesContent, 'utf-8');
      return { updated: true, path: ruleFilePath, ide: effectiveIde };
    } else if (updateMethod === 'inject') {
      let existingContent = '';
      try {
        existingContent = await fs.readFile(ruleFilePath, 'utf-8');
      } catch (readError: any) {
        if (readError.code === 'ENOENT') {
          // File doesn't exist, create it with the rules content
          await fs.writeFile(ruleFilePath, rulesContent, 'utf-8');
          return { updated: true, path: ruleFilePath, ide: effectiveIde }; // Indicate created?
        } else {
          // Other read error
          throw readError;
        }
      }

      const tagStart = '<vibe-tools Integration>';
      const tagEnd = '</vibe-tools Integration>';
      const tagStartIndex = existingContent.indexOf(tagStart);
      const tagEndIndex = existingContent.indexOf(tagEnd);

      let newContent: string;

      if (tagStartIndex !== -1 && tagEndIndex !== -1 && tagEndIndex > tagStartIndex) {
        // Update existing section
        newContent =
          existingContent.substring(0, tagStartIndex) +
          rulesContent + // rulesContent already includes the tags
          existingContent.substring(tagEndIndex + tagEnd.length);
      } else {
        // Append new section if tags not found or invalid
        // Add a newline if the existing content doesn't end with one
        const separator = existingContent.endsWith('\n') ? '' : '\n';
        newContent = existingContent + separator + '\n' + rulesContent;
      }

      // Only write if content changed to avoid unnecessary modifications
      if (newContent !== existingContent) {
        await fs.writeFile(ruleFilePath, newContent, 'utf-8');
        return { updated: true, path: ruleFilePath, ide: effectiveIde };
      } else {
        // Content is already up-to-date (this shouldn't happen if called after check, but safe)
        return { updated: false, path: ruleFilePath, ide: effectiveIde, reason: undefined }; // Not updated, but not an error
      }
    }
    // Should not reach here
    return {
      updated: false,
      ide: effectiveIde,
      reason: 'update_failed',
      error: new Error('Invalid update method'),
    };
  } catch (error: any) {
    return {
      updated: false,
      path: ruleFilePath,
      ide: effectiveIde,
      reason: 'update_failed',
      error,
    };
  }
}

// Added export
export function isRulesContentUpToDate(
  targetDir: string,
  ide: string
): {
  needsUpdate: boolean;
  message?: string;
  path?: string; // Include path in response for clarity
} {
  const { path: ruleFilePath } = getRuleFilePath(targetDir, ide); // Get path using helper

  let content: string;
  try {
    if (!existsSync(ruleFilePath)) {
      // If the determined rules file doesn't exist, it needs "updating" (creation)
      return {
        needsUpdate: true,
        message: `Rules file for ${ide} not found at expected location ${ruleFilePath}. Run vibe-tools install . to create it.`,
        path: ruleFilePath,
      };
    }
    content = readFileSync(ruleFilePath, 'utf-8');
  } catch (error: any) {
    return {
      needsUpdate: true, // Treat read errors as needing an update
      message: `Could not read rules file ${ruleFilePath}: ${error.message}`,
      path: ruleFilePath,
    };
  }

  const startTag = '<vibe-tools Integration>';
  const endTag = '</vibe-tools Integration>';

  if (!content.includes(startTag) || !content.includes(endTag)) {
    return {
      needsUpdate: true, // Needs update if tags are missing
      message: `vibe-tools section not found in rules file ${ruleFilePath}. Run vibe-tools install . to create or update it.`,
      path: ruleFilePath, // Include path
    };
  }

  // Check version within the tags
  const versionMatch = content.match(/<!-- vibe-tools-version: ([\w.-]+) -->/);
  const fileVersion = versionMatch ? versionMatch[1] : '0'; // Default to '0' if version comment not found

  if (fileVersion !== VIBE_TOOLS_RULES_VERSION) {
    return {
      needsUpdate: true,
      message: `Your vibe-tools rules file at ${ruleFilePath} is using version ${fileVersion}, but the current version is ${VIBE_TOOLS_RULES_VERSION}. Run vibe-tools install . to update.`,
      path: ruleFilePath, // Include path
    };
  }

  // Tags and version are correct
  return { needsUpdate: false, path: ruleFilePath }; // Include path even if up-to-date
}

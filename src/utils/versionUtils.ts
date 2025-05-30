import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import consola from 'consola';
import { FULL_PACKAGE_NAME } from '../constants/package';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface VersionInfo {
  current: string;
  latest: string | null;
  isOutdated: boolean;
}


/**
 * Gets the currently installed version by searching upwards
 * for a package.json file with the expected package name.
 */
export function getCurrentVersion(): string {
  let currentDir = __dirname;
  let attempts = 0;
  const maxAttempts = 5; // Prevent infinite loops

  while (attempts < maxAttempts) {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);

        // Check if this is our package (original or fork)
        if (packageJson.name === FULL_PACKAGE_NAME) {
          consola.debug(`Found ${packageJson.name} package.json at:`, packageJsonPath);
          return packageJson.version;
        }
      } catch (error) {
        // Ignore errors reading/parsing intermediate package.json files
        consola.debug('Error reading/parsing intermediate package.json:', packageJsonPath, error);
      }
    }

    const parentDir = resolve(currentDir, '..');
    // Stop if we have reached the root directory
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
    attempts++;
  }

  consola.error(`Could not find ${FULL_PACKAGE_NAME} package.json by searching upwards from`, __dirname);
  return '0.0.0'; // Fallback version
}

/**
 * Gets the latest available version from the NPM registry.
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`npm view ${FULL_PACKAGE_NAME} version`);
    return stdout.trim();
  } catch (error) {
    consola.warn('Failed to fetch latest version from NPM:', error);
    return null; // Indicate failure to fetch
  }
}

/**
 * Checks if the currently installed version is outdated compared to the latest NPM version.
 * Note: This uses simple string comparison. For robust comparison (e.g., handling pre-releases),
 * a library like 'semver' would be better, but sticking to simplicity for now.
 */
export async function checkPackageVersion(): Promise<VersionInfo> {
  try {
    const current = getCurrentVersion();
    // If we couldn't even get the current version, don't proceed with check/update
    if (current === '0.0.0') {
      consola.warn('Could not determine current package version. Skipping update check.');
      return { current: '0.0.0', latest: null, isOutdated: false };
    }

    const latest = await getLatestVersion();

    if (latest) {
      const [currentMajor, currentMinor, currentPatchish] = current.split('.');
      const currentPatch = currentPatchish?.split('-')[0];

      const [latestMajor, latestMinor, latestPatchish] = latest.split('.');
      const latestPatch = latestPatchish?.split('-')[0];

      let isOutdated = false;
      if (parseInt(currentMajor) < parseInt(latestMajor)) {
        isOutdated = true;
      }
      if (
        parseInt(currentMajor) === parseInt(latestMajor) &&
        parseInt(currentMinor) < parseInt(latestMinor)
      ) {
        isOutdated = true;
      }
      if (
        parseInt(currentMajor) === parseInt(latestMajor) &&
        parseInt(currentMinor) === parseInt(latestMinor) &&
        parseInt(currentPatch) < parseInt(latestPatch)
      ) {
        isOutdated = true;
      }

      return {
        current,
        latest,
        isOutdated,
      };
    } else {
      consola.warn('Could not determine latest package version. Skipping update check.');
      return { current, latest: null, isOutdated: false };
    }
  } catch (error) {
    consola.warn('Error checking package version:', error);
    return {
      current: '0.0.0', // Ensure fallback on any check error
      latest: null,
      isOutdated: false,
    };
  }
}

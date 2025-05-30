/**
 * Package constants that can be overridden at build time
 * This file serves as a single source of truth for package-specific values
 */

// These values are replaced during the build process for forks
export const PACKAGE_NAME = process.env.VIBE_TOOLS_PACKAGE_NAME || 'vibe-tools';
export const PACKAGE_SCOPE = process.env.VIBE_TOOLS_PACKAGE_SCOPE || null;
export const FULL_PACKAGE_NAME = PACKAGE_SCOPE ? `${PACKAGE_SCOPE}/${PACKAGE_NAME}` : PACKAGE_NAME;

// Config directory name (shared across forks)
export const CONFIG_DIR_NAME = '.vibe-tools';

// Check if this is a fork
export const IS_FORK = PACKAGE_NAME !== 'vibe-tools';
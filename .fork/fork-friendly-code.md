# Fork-Friendly Code Architecture

This document explains the architecture that makes vibe-tools fork-friendly and maintainable.

## Problem

When forking a package and publishing under a different name (e.g., `@vabole/vibe-tools`), hardcoded package names throughout the codebase create:
- Merge conflicts when syncing with upstream
- Broken functionality (version checks, update commands, etc.)
- Maintenance burden

## Solution: Build-Time Package Name Injection

### 1. **Central Constants File** (`src/constants/package.ts`)

All package-specific values are defined in one place:

```typescript
export const PACKAGE_NAME = process.env.VIBE_TOOLS_PACKAGE_NAME || 'vibe-tools';
export const PACKAGE_SCOPE = process.env.VIBE_TOOLS_PACKAGE_SCOPE || null;
export const FULL_PACKAGE_NAME = PACKAGE_SCOPE ? `${PACKAGE_SCOPE}/${PACKAGE_NAME}` : PACKAGE_NAME;
```

### 2. **Build-Time Injection**

The build script (`build.js`) injects environment variables at build time:

```javascript
define: {
  'process.env.VIBE_TOOLS_PACKAGE_NAME': JSON.stringify(process.env.VIBE_TOOLS_PACKAGE_NAME || ''),
  'process.env.VIBE_TOOLS_PACKAGE_SCOPE': JSON.stringify(process.env.VIBE_TOOLS_PACKAGE_SCOPE || '')
}
```

### 3. **Fork Publishing Script**

The fork publish script sets these variables during build:

```javascript
const buildEnv = {
  ...process.env,
  VIBE_TOOLS_PACKAGE_NAME: 'vibe-tools',
  VIBE_TOOLS_PACKAGE_SCOPE: '@vabole'
};
execSync('pnpm run build', { env: buildEnv });
```

## Benefits

1. **Zero Merge Conflicts**: Source code uses generic constants, not hardcoded names
2. **Upstream Compatibility**: No fork-specific code in the main codebase
3. **Automatic Functionality**: Version checks, updates, etc. work correctly for forks
4. **Single Point of Configuration**: Just set env vars during build

## Usage

### For Original Package
Normal build works as-is:
```bash
pnpm run build  # Uses 'vibe-tools'
```

### For Forks
Handled automatically by CI workflow:
```bash
# CI sets these during build:
# VIBE_TOOLS_PACKAGE_NAME=vibe-tools
# VIBE_TOOLS_PACKAGE_SCOPE=@vabole
git push origin publish/main
```

## Areas Covered

- ✅ Version checking (`getCurrentVersion`)
- ✅ Update checking (`getLatestVersion`)
- ✅ Update commands (npm/yarn/pnpm/bun install)
- ✅ Package name in messages and logs

## Future Considerations

If new code needs the package name:
1. Import from `src/constants/package.ts`
2. Use `FULL_PACKAGE_NAME` for the complete name
3. Never hardcode package names

This approach ensures forks remain maintainable and upstream-friendly!
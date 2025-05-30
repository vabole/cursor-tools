# Publishing Guide for @vabole/vibe-tools

## Prerequisites

1. **NPM Authentication**: Ensure `VABOLE_NPM_KEY` is set in your environment
   ```bash
   export VABOLE_NPM_KEY=your-npm-token-here
   ```

2. **Clean Working Directory**: Commit or stash any changes before publishing

## Publishing Process

### 1. Switch to publish branch
```bash
git checkout publish/main
```

### 2. Merge latest changes (if any)
```bash
# If you have new features to include
git merge feature/your-feature

# If upstream PR got updated
git merge add-with-diff-flag
```

### 3. Run the publish script
```bash
node scripts/publish-fork.js
```

The script will:
- ✅ Generate version like `0.61.5-vabole.3`
- ✅ Check if version already exists on npm
- ✅ Update package.json temporarily
- ✅ Build the project
- ✅ Publish to npm automatically
- ✅ Create git tag `fork-v0.61.5-vabole.3`
- ✅ Restore original package.json

### 4. Push tags (optional)
```bash
git push origin --tags
```

## Version Management

### How versions work

The `.fork-version.json` file tracks your iterations:
```json
{
  "baseVersion": "0.61.5",
  "forkIteration": 3
}
```

- When upstream version changes, iteration resets to 1
- Each publish increments the iteration
- Version format: `{upstream}-vabole.{iteration}`

### After upstream releases

When upstream releases a new version (e.g., 0.61.6):

1. Update main branch:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. Merge to publish branch:
   ```bash
   git checkout publish/main
   git merge main
   ```

3. Next publish will automatically use `0.61.6-vabole.1`

## Troubleshooting

### "Version already exists" error
The script tracks iterations, so just run it again - it will increment automatically.

### Build fails
Ensure all dependencies are installed:
```bash
pnpm install
```

### Git tag already exists
This is OK - the script will continue. Tags help track what was published when.

## Installing Your Fork

Users can install your fork with:
```bash
npm install @vabole/vibe-tools@0.61.5-vabole.3
```

Or latest:
```bash
npm install @vabole/vibe-tools@latest
```
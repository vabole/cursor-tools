# Publishing Guide for @vabole/vibe-tools

## 🚀 CI Publishing (GitHub Actions)

Publishing is completely automated through GitHub Actions. No manual intervention required!

### Prerequisites
1. **GitHub Secret**: `VABOLE_NPM_TOKEN` must be configured (see [setup-ci.md](./setup-ci.md))
2. **Clean Git State**: All changes committed to `publish/main`

### Publishing Process

**Simply push to the publish branch:**

```bash
# Make sure your changes are committed
git add .
git commit -m "feat: add awesome new feature"

# Push to trigger automatic publish
git push origin publish/main
```

**That's it!** The CI workflow will automatically:
- ✅ Calculate next fork version (e.g., `0.61.5-vabole.2`)
- ✅ Check if version already exists
- ✅ Build with fork configuration  
- ✅ Publish to npm
- ✅ Create git tags
- ✅ Update version log

### Monitor Publishing

Watch the workflow progress:
```bash
# View recent workflow runs
gh run list --repo vabole/cursor-tools --limit 3

# Watch a specific run
gh run watch [RUN_ID] --repo vabole/cursor-tools

# View logs if something fails
gh run view [RUN_ID] --log-failed --repo vabole/cursor-tools
```

### Version Management

Versions are automatically calculated:
- **Base version**: Extracted from `package.json` (e.g., `0.61.5`)
- **Fork version**: `{base}-vabole.{iteration}` (e.g., `0.61.5-vabole.3`)
- **Iteration**: Auto-incremented for each publish

### Workflow Behavior

**Smart Publishing:**
- ✅ Skips if version already exists on npm
- ✅ Handles version conflicts automatically
- ✅ Only publishes when changes are detected

**Error Handling:**
- ❌ Build failures stop the publish
- ❌ npm authentication issues are logged clearly
- ❌ Git conflicts are reported with helpful messages

## 📦 Installation

Users can install your published fork:

```bash
# Latest version
npm install -g @vabole/vibe-tools@latest

# Specific version
npm install -g @vabole/vibe-tools@0.61.5-vabole.2
```

## 🔍 Troubleshooting

### Workflow not triggering
- Ensure you're pushing to `publish/main` branch
- Check if workflow file exists: `.github/workflows/publish-fork.yml`

### Authentication errors
- Verify `VABOLE_NPM_TOKEN` secret is configured
- Check token hasn't expired
- Ensure token has publish permissions

### Version conflicts
- CI automatically handles this by incrementing iteration
- Check [version-log.md](./version-log.md) for published versions

### Build failures
- Check if all dependencies install correctly
- Verify TypeScript compilation passes
- Look for missing environment variables

## 📊 Monitoring

- **Workflow Runs**: https://github.com/vabole/cursor-tools/actions
- **Published Versions**: https://www.npmjs.com/package/@vabole/vibe-tools
- **Git Tags**: `git tag | grep fork-v`
- **Version Log**: [version-log.md](./version-log.md)
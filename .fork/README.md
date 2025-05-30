# Fork Management Guide

This directory contains documentation and tooling specific to the @vabole/vibe-tools fork.

## Quick Links

- [CI Setup Guide](./setup-ci.md) - 🚀 **Recommended**: Set up automated publishing
- [Publishing Guide](./publish-guide.md) - How to publish new versions (CI + local)
- [Workflow Overview](./workflow.md) - Git workflow for managing fork and upstream
- [Version History](./version-log.md) - Track of published versions
- [Fork-Friendly Code](./fork-friendly-code.md) - Technical architecture details

## Key Concepts

### Branch Structure

```
main (tracks upstream/main)
├── add-with-diff-flag (PR #156 - keep clean for upstream)
├── publish/main (your published version - contains all features + fork tooling)
└── feature/* (new development branches)
```

### Versioning Strategy

We use pre-release versions to avoid conflicts with upstream:
- Upstream: `0.61.5`
- Our versions: `0.61.5-vabole.1`, `0.61.5-vabole.2`, etc.

### Important Files

- `/.github/workflows/publish-fork.yml` - Automated CI publishing workflow
- `/.fork-version.json` - Tracks fork version iterations (auto-managed by CI)
- `/.fork/` - This documentation directory (git-ignored on PR branches)

## Quick Commands

```bash
# Publish a new version (automated via CI)
git push origin publish/main

# Sync with upstream
git checkout main
git pull upstream main

# Start new feature
git checkout main
git checkout -b feature/my-feature

# Monitor publishing
gh run list --repo vabole/cursor-tools --limit 3

# View these docs from any branch
git show publish/main:.fork/README.md
```

## Setup Git Alias (Optional)

For easy access to fork docs from any branch:

```bash
git config alias.fork-docs "!git show publish/main:.fork/README.md"
git config alias.fork-publish "!git show publish/main:.fork/publish-guide.md"
```

Then use: `git fork-docs` or `git fork-publish`
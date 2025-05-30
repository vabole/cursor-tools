# Fork Workflow

This document describes the git workflow for managing the @vabole/vibe-tools fork while contributing to upstream.

## Branch Strategy

### Core Branches

1. **`main`** - Mirrors upstream/main exactly
   - Never commit directly here
   - Only pull from upstream

2. **`publish/main`** - Your production branch
   - Contains all your features
   - Has fork-specific tooling (publish script, .fork docs)
   - This is what gets published to npm

3. **`add-with-diff-flag`** - PR branch
   - Keep clean for upstream review
   - Don't add fork-specific files here

### Feature Development

```
main
 └─> feature/new-thing (branch from main)
      └─> publish/main (merge when ready to use)
      └─> upstream PR (when ready to contribute)
```

## Common Workflows

### 1. Starting New Feature

```bash
# Always start from updated main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/awesome-new-command

# Develop your feature
# ... make changes ...
git add .
git commit -m "feat: add awesome command"
```

### 2. Using Feature in Your Fork

```bash
# Merge to publish branch
git checkout publish/main
git merge feature/awesome-new-command

# Publish new version (automated)
git push origin publish/main
```

### 3. Contributing Feature Upstream

```bash
# Push feature branch
git push origin feature/awesome-new-command

# Create PR on GitHub from feature branch to upstream/main
```

### 4. Handling PR Feedback

```bash
# Make changes on PR branch
git checkout add-with-diff-flag
# ... address feedback ...
git commit -m "address review comments"
git push origin add-with-diff-flag

# Also update your fork
git checkout publish/main
git merge add-with-diff-flag
git push origin publish/main  # Automatically publishes
```

### 5. After PR Merges

```bash
# Update main
git checkout main
git pull upstream main

# Your feature is now in main!
# Can delete feature branch
git branch -d feature/awesome-new-command

# Rebase publish branch (optional, for cleaner history)
git checkout publish/main
git rebase main
```

## Important Rules

### ✅ DO

- Always branch features from `main`
- Keep PR branches clean (no fork-specific files)
- Merge features to `publish/main` for immediate use
- Document significant features in .fork/

### ❌ DON'T

- Don't commit directly to `main`
- Don't add `.fork/`, `.github/workflows/publish-fork.yml` to PR branches
- Don't manually publish (CI handles this automatically)
- Don't force-push to branches with open PRs

## Syncing with Upstream

### Regular Sync (Recommended Weekly)

```bash
# Update main
git checkout main
git pull upstream main

# Update publish branch
git checkout publish/main
git merge main  # or rebase if you prefer

# Check if any of your PRs were merged
git log --oneline main
```

### Handling Conflicts

If conflicts arise when merging upstream:

1. On `publish/main`:
   ```bash
   git merge main
   # Resolve conflicts, keeping your features
   git add .
   git commit
   ```

2. Document any significant conflict resolutions in `.fork/conflicts.md`

## Git Aliases for Efficiency

Add these to your git config:

```bash
# Fork-specific aliases
git config alias.fork-sync "!git checkout main && git pull upstream main && git checkout publish/main && git merge main"
git config alias.fork-new "!f() { git checkout main && git pull upstream main && git checkout -b feature/\$1; }; f"
git config alias.fork-publish "!git checkout publish/main && git push origin publish/main"

# Usage:
git fork-sync            # Sync with upstream
git fork-new my-feature  # Start new feature branch
git fork-publish         # Publish via CI (push to publish/main)
```
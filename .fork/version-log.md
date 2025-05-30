# Version History

Track of all published versions of @vabole/vibe-tools

## Version Log

| Version | Base Version | Date | Features | Notes |
|---------|--------------|------|----------|-------|
| 0.61.5-vabole.1-vabole.1 | 0.61.5 | 2025-01-30 | - `--with-diff` flag for repo command<br>- Fork publishing system | Initial fork release (version doubled due to script run) |

## How to Update This Log

After each publish, add a new row with:
1. The published version (e.g., `0.61.5-vabole.1`)
2. The upstream base version
3. Publication date
4. Key features/changes in this release
5. Any important notes

## Checking Published Versions

To see all published versions on npm:
```bash
npm view @vabole/vibe-tools versions --json
```

To see details of a specific version:
```bash
npm view @vabole/vibe-tools@0.61.5-vabole.1
```

## Git Tags

Each published version has a corresponding git tag:
- Format: `fork-v{version}`
- Example: `fork-v0.61.5-vabole.1`

View all fork tags:
```bash
git tag | grep fork-v
```
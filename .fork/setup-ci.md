# Setting Up CI Publishing

This guide walks you through setting up automated publishing via GitHub Actions.

## 🔐 Step 1: Create NPM Token

1. **Log in to npm**: Go to [npmjs.com](https://npmjs.com) and log in
2. **Generate Token**: 
   - Click your profile → "Access Tokens"
   - Click "Generate New Token" → "Automation"
   - **Important**: Make sure 2FA is NOT required for this token
3. **Copy Token**: Save it securely (you'll only see it once)

## 🛠️ Step 2: Add GitHub Secret

1. **Go to Repository Settings**:
   - Navigate to `https://github.com/vabole/cursor-tools/settings/secrets/actions`
   
2. **Add New Secret**:
   - Click "New repository secret"
   - **Name**: `VABOLE_NPM_TOKEN`
   - **Value**: Paste your npm token
   - Click "Add secret"

## ✅ Step 3: Test the Workflow

1. **Make a small change**:
   ```bash
   # Edit something minor, like a comment
   echo "# Test change" >> .fork/test.md
   git add .
   git commit -m "test: verify CI publishing"
   ```

2. **Push to trigger workflow**:
   ```bash
   git push origin publish/main
   ```

3. **Watch the action**:
   - Go to: `https://github.com/vabole/cursor-tools/actions`
   - You should see "Publish Fork" workflow running
   - Click on it to see real-time logs

## 🎉 Step 4: Verify Success

After the workflow completes:

1. **Check npm**: Visit `https://www.npmjs.com/package/@vabole/vibe-tools`
2. **Check tags**: New git tag should be created
3. **Check version log**: `.fork/version-log.md` should be updated

## 🔧 Troubleshooting

### Workflow fails with "401 Unauthorized"
- Check that `VABOLE_NPM_TOKEN` secret is set correctly
- Verify npm token has correct permissions
- Make sure token doesn't require 2FA

### Workflow skips with "Version already exists"
- This is normal - it means that version was already published
- Make another commit to trigger a new version increment

### Permission errors on git operations
- GitHub Actions should have default permissions
- If issues persist, check repository settings

## 🚀 Benefits

Once set up, publishing is as simple as:
```bash
git push origin publish/main
```

No more:
- ❌ Local token conflicts
- ❌ 2FA interruptions  
- ❌ Environment setup issues
- ❌ Manual version management
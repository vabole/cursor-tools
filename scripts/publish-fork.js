#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Fork versioning configuration
const FORK_IDENTIFIER = 'vabole';
const VERSION_FILE = join(rootDir, '.fork-version.json');

// Read the current package.json
const packageJsonPath = join(rootDir, 'package.json');
const originalContent = readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(originalContent);

// Store original values
const originalName = packageJson.name;
const originalVersion = packageJson.version;
const originalRepo = packageJson.repository;
const originalHomepage = packageJson.homepage;
const originalBugs = packageJson.bugs;

// Function to get/update fork version
function manageForkVersion(upstreamVersion) {
  let versionData = { baseVersion: upstreamVersion, forkIteration: 1 };
  
  if (existsSync(VERSION_FILE)) {
    const existing = JSON.parse(readFileSync(VERSION_FILE, 'utf8'));
    if (existing.baseVersion === upstreamVersion) {
      // Same base version, increment fork iteration
      versionData.forkIteration = existing.forkIteration + 1;
    } else {
      // New base version, reset fork iteration
      console.log(`📌 Base version changed from ${existing.baseVersion} to ${upstreamVersion}`);
      versionData.baseVersion = upstreamVersion;
      versionData.forkIteration = 1;
    }
  }
  
  // Save version data
  writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
  
  // Generate fork version
  return `${upstreamVersion}-${FORK_IDENTIFIER}.${versionData.forkIteration}`;
}

// Function to check if version exists on npm
async function versionExists(packageName, version) {
  try {
    execSync(`npm view ${packageName}@${version} version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Generate fork version
const forkVersion = manageForkVersion(originalVersion);
const forkPackageName = '@vabole/vibe-tools';

// Update package.json for your scoped package
packageJson.name = forkPackageName;
packageJson.version = forkVersion;
packageJson.repository = {
  type: 'git',
  url: 'git+https://github.com/vabole/cursor-tools.git'
};
packageJson.homepage = 'https://github.com/vabole/cursor-tools#readme';
packageJson.bugs = {
  url: 'https://github.com/vabole/cursor-tools/issues'
};

// Add publishConfig for scoped packages
packageJson.publishConfig = {
  access: 'public'
};

// Add metadata about upstream version
packageJson.forkMetadata = {
  upstreamVersion: originalVersion,
  upstreamPackage: originalName,
  forkIdentifier: FORK_IDENTIFIER
};

// Function to prompt for 2FA
function prompt2FA() {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Enter your npm 2FA code: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function publish() {
  try {
    // Check if this version already exists
    if (await versionExists(forkPackageName, forkVersion)) {
      console.error(`❌ Version ${forkVersion} already exists on npm!`);
      console.log('💡 Try running the script again to increment the version.');
      process.exit(1);
    }
    
    console.log(`📦 Publishing ${forkPackageName}@${forkVersion}`);
    console.log(`   (based on ${originalName}@${originalVersion})`);
    
    // Write the modified package.json
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json');

    // Ensure we're logged in with the token
    if (!process.env.VABOLE_NPM_KEY) {
      console.error('❌ VABOLE_NPM_KEY environment variable not found');
      process.exit(1);
    }

    // Set the auth token
    execSync(`npm config set //registry.npmjs.org/:_authToken=${process.env.VABOLE_NPM_KEY}`, {
      stdio: 'inherit'
    });
    console.log('✅ NPM auth token configured');

    // Build the project
    console.log('🔨 Building the project...');
    execSync('pnpm run build', { stdio: 'inherit', cwd: rootDir });
    
    // Ensure dist/package.json has the updated name
    const distPackageJsonPath = join(rootDir, 'dist', 'package.json');
    writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated dist/package.json');

    // Get 2FA code
    const otpCode = await prompt2FA();

    // Publish with OTP
    console.log(`📤 Publishing to npm...`);
    execSync(`npm publish --otp=${otpCode}`, {
      stdio: 'inherit',
      cwd: rootDir
    });

    console.log(`✅ Successfully published ${forkPackageName}@${forkVersion}!`);
    console.log(`\n📌 To install: npm install ${forkPackageName}@${forkVersion}`);
    
    // Create a git tag for this release
    const tagName = `fork-v${forkVersion}`;
    try {
      execSync(`git tag ${tagName}`, { cwd: rootDir });
      console.log(`🏷️  Created git tag: ${tagName}`);
    } catch (e) {
      console.log(`⚠️  Could not create git tag (may already exist)`);
    }
    
  } catch (error) {
    console.error('❌ Publishing failed:', error.message);
    process.exit(1);
  } finally {
    // Always restore original package.json
    writeFileSync(packageJsonPath, originalContent);
    console.log('✅ Restored original package.json');
  }
}

// Run the publish script
publish();
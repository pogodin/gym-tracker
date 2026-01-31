#!/usr/bin/env node

/**
 * Firebase Test Lab Setup Script
 *
 * Guides you through setting up Firebase Test Lab for the gym-tracker app.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function exec(command: string, silent = false): string | null {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
  } catch {
    return null;
  }
}

async function main() {
  console.log(chalk.blue.bold('\n🔥 Firebase Test Lab Setup\n'));
  console.log(chalk.gray('This wizard will help you set up Firebase Test Lab for Android testing.\n'));

  // Step 1: Check gcloud
  console.log(chalk.bold('Step 1: Google Cloud SDK\n'));

  const gcloudVersion = exec('gcloud --version', true);
  if (gcloudVersion) {
    console.log(chalk.green('  ✅ gcloud CLI is installed\n'));
  } else {
    console.log(chalk.red('  ❌ gcloud CLI not found\n'));
    console.log(chalk.white('  Please install the Google Cloud SDK:'));
    console.log(chalk.cyan('  https://cloud.google.com/sdk/docs/install\n'));
    console.log(chalk.gray('  After installation, run this setup again.\n'));
    rl.close();
    process.exit(1);
  }

  // Step 2: Authentication
  console.log(chalk.bold('Step 2: Authentication\n'));

  const account = exec('gcloud config get-value account', true)?.trim();
  if (account && account !== '(unset)') {
    console.log(chalk.green(`  ✅ Logged in as: ${account}\n`));
  } else {
    console.log(chalk.yellow('  ⚠️  Not logged in\n'));
    const login = await ask('  Do you want to log in now? (y/n): ');
    if (login.toLowerCase() === 'y') {
      console.log(chalk.gray('\n  Opening browser for authentication...\n'));
      exec('gcloud auth login');
    } else {
      console.log(chalk.gray('\n  Run "gcloud auth login" when ready.\n'));
    }
  }

  // Step 3: Project setup
  console.log(chalk.bold('Step 3: Firebase Project\n'));

  const currentProject = exec('gcloud config get-value project', true)?.trim();
  if (currentProject && currentProject !== '(unset)') {
    console.log(chalk.green(`  ✅ Current project: ${currentProject}\n`));
    const keepProject = await ask('  Use this project? (y/n): ');
    if (keepProject.toLowerCase() !== 'y') {
      const newProject = await ask('  Enter Firebase project ID: ');
      exec(`gcloud config set project ${newProject}`);
      console.log(chalk.green(`\n  ✅ Project set to: ${newProject}\n`));
    }
  } else {
    console.log(chalk.yellow('  ⚠️  No project selected\n'));
    console.log(chalk.white('  You need a Firebase project with Test Lab enabled.'));
    console.log(chalk.gray('  Create one at: https://console.firebase.google.com\n'));

    const projectId = await ask('  Enter your Firebase project ID: ');
    if (projectId) {
      exec(`gcloud config set project ${projectId}`);
      console.log(chalk.green(`\n  ✅ Project set to: ${projectId}\n`));
    }
  }

  // Step 4: Enable Test Lab API
  console.log(chalk.bold('Step 4: Enable Test Lab API\n'));
  console.log(chalk.gray('  Enabling Firebase Test Lab API...\n'));

  const enableResult = exec(
    'gcloud services enable testing.googleapis.com toolresults.googleapis.com',
    true
  );
  if (enableResult !== null) {
    console.log(chalk.green('  ✅ Test Lab API enabled\n'));
  } else {
    console.log(chalk.yellow('  ⚠️  Could not enable API (may already be enabled)\n'));
  }

  // Step 5: List available devices
  console.log(chalk.bold('Step 5: Available Devices\n'));
  console.log(chalk.gray('  Fetching available Android devices...\n'));

  const devices = exec('gcloud firebase test android models list --format="table(modelId,name,supportedVersionIds)"', true);
  if (devices) {
    console.log(chalk.white('  Popular devices for testing:\n'));
    console.log(chalk.gray('  Virtual (60 min/day free):'));
    console.log(chalk.cyan('    - Pixel2 (API 30)'));
    console.log(chalk.cyan('    - Pixel3 (API 30)'));
    console.log(chalk.gray('\n  Physical (30 min/day free):'));
    console.log(chalk.cyan('    - oriole / Pixel 6 (API 33)'));
    console.log(chalk.cyan('    - bluejay / Pixel 6a (API 33)\n'));
  }

  // Summary
  console.log(chalk.bold('═══════════════════════════════════════'));
  console.log(chalk.bold('           Setup Complete!'));
  console.log(chalk.bold('═══════════════════════════════════════\n'));

  console.log(chalk.white('Next steps:\n'));
  console.log(chalk.gray('1. Build your Android app:'));
  console.log(chalk.cyan('   cd gym-tracker && npm run build && npx cap sync android'));
  console.log(chalk.cyan('   cd android && ./gradlew assembleDebug\n'));

  console.log(chalk.gray('2. Run tests on Firebase Test Lab:'));
  console.log(chalk.cyan('   npm run test:firebase\n'));

  console.log(chalk.gray('3. For physical devices (uses more quota):'));
  console.log(chalk.cyan('   npm run test:firebase -- --physical\n'));

  console.log(chalk.gray('Free tier limits:'));
  console.log(chalk.green('   • 60 min/day on virtual devices'));
  console.log(chalk.green('   • 30 min/day on physical devices\n'));

  rl.close();
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  rl.close();
  process.exit(1);
});

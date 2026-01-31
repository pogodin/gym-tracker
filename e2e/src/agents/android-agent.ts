#!/usr/bin/env node

/**
 * Android Testing Agent Entry Point
 *
 * This script is designed to be invoked by a Claude agent that will:
 * 1. Verify the Android development environment
 * 2. Build the app
 * 3. Run the integration tests
 * 4. Report results
 *
 * The agent should read the prompt from: agents/android-agent-prompt.md
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const PROJECT_ROOT = join(process.cwd(), '..');
const E2E_ROOT = process.cwd();

interface EnvironmentCheck {
  name: string;
  status: 'ok' | 'error';
  message: string;
}

function checkEnvironment(): EnvironmentCheck[] {
  const checks: EnvironmentCheck[] = [];

  // Check ANDROID_HOME
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome && existsSync(androidHome)) {
    checks.push({
      name: 'Android SDK',
      status: 'ok',
      message: `ANDROID_HOME: ${androidHome}`,
    });
  } else {
    checks.push({
      name: 'Android SDK',
      status: 'error',
      message: 'ANDROID_HOME not set or invalid',
    });
  }

  // Check emulators
  try {
    const emulators = execSync('emulator -list-avds', {
      encoding: 'utf-8',
    }).trim();
    const count = emulators.split('\n').filter(Boolean).length;
    checks.push({
      name: 'Android Emulators',
      status: count > 0 ? 'ok' : 'error',
      message: count > 0 ? `${count} AVD(s) available` : 'No emulators found',
    });
  } catch {
    checks.push({
      name: 'Android Emulators',
      status: 'error',
      message: 'Could not list emulators. Is emulator in PATH?',
    });
  }

  // Check ADB
  try {
    execSync('adb version', { encoding: 'utf-8' });
    checks.push({
      name: 'ADB',
      status: 'ok',
      message: 'Available',
    });
  } catch {
    checks.push({
      name: 'ADB',
      status: 'error',
      message: 'ADB not found in PATH',
    });
  }

  // Check Appium
  try {
    execSync('npx appium --version', { encoding: 'utf-8', cwd: E2E_ROOT });
    checks.push({
      name: 'Appium',
      status: 'ok',
      message: 'Installed',
    });
  } catch {
    checks.push({
      name: 'Appium',
      status: 'error',
      message: 'Appium not found. Run: npm install in e2e directory',
    });
  }

  // Check Android app build
  const apkPath = join(
    PROJECT_ROOT,
    'android/app/build/outputs/apk/debug/app-debug.apk'
  );
  if (existsSync(apkPath)) {
    checks.push({
      name: 'Android APK',
      status: 'ok',
      message: 'app-debug.apk exists',
    });
  } else {
    checks.push({
      name: 'Android APK',
      status: 'error',
      message: 'APK not built. Run: cd android && ./gradlew assembleDebug',
    });
  }

  return checks;
}

function printChecks(checks: EnvironmentCheck[]) {
  console.log(chalk.bold('\n📋 Environment Checks:\n'));

  for (const check of checks) {
    const icon = check.status === 'ok' ? '✅' : '❌';
    const color = check.status === 'ok' ? chalk.green : chalk.red;
    console.log(`  ${icon} ${chalk.bold(check.name)}: ${color(check.message)}`);
  }
  console.log('');
}

async function main() {
  console.log(chalk.green.bold('\n🤖 Android Integration Testing Agent\n'));
  console.log(chalk.gray('This agent verifies the environment and runs Android tests.\n'));

  // Run environment checks
  const checks = checkEnvironment();
  printChecks(checks);

  const errors = checks.filter((c) => c.status === 'error');

  if (errors.length > 0) {
    console.log(chalk.yellow('⚠️  Environment issues detected.\n'));
    console.log(chalk.bold('Required actions:'));
    for (const error of errors) {
      console.log(`  • ${error.name}: ${error.message}`);
    }
    console.log('');
    console.log(chalk.gray('Fix the above issues, then run this agent again.'));
    process.exit(1);
  }

  console.log(chalk.green('✅ Environment OK\n'));

  // Provide instructions for the Claude agent
  console.log(chalk.bold('📝 Agent Instructions:\n'));
  console.log('  1. Start Android Emulator: emulator -avd <AVD_NAME> &');
  console.log('  2. Wait for boot: adb wait-for-device');
  console.log('  3. Start Appium server: npx appium');
  console.log('  4. Run tests: npm run test:android');
  console.log('  5. Analyze results and screenshots');
  console.log('');

  console.log(chalk.cyan('Ready for test execution.'));
}

main().catch(console.error);

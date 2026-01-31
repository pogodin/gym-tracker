#!/usr/bin/env node

/**
 * iOS Testing Agent Entry Point
 *
 * This script is designed to be invoked by a Claude agent that will:
 * 1. Verify the iOS development environment
 * 2. Build the app
 * 3. Run the integration tests
 * 4. Report results
 *
 * The agent should read the prompt from: agents/ios-agent-prompt.md
 */

import { execSync, spawn } from 'child_process';
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

  // Check Xcode
  try {
    const xcodePath = execSync('xcode-select -p', { encoding: 'utf-8' }).trim();
    checks.push({
      name: 'Xcode',
      status: 'ok',
      message: `Found at ${xcodePath}`,
    });
  } catch {
    checks.push({
      name: 'Xcode',
      status: 'error',
      message: 'Xcode not found. Run: xcode-select --install',
    });
  }

  // Check simulators
  try {
    const simulators = execSync('xcrun simctl list devices available -j', {
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(simulators);
    const iphoneCount = Object.values(parsed.devices)
      .flat()
      .filter((d: any) => d.name?.includes('iPhone')).length;
    checks.push({
      name: 'iOS Simulators',
      status: iphoneCount > 0 ? 'ok' : 'error',
      message: `${iphoneCount} iPhone simulators available`,
    });
  } catch {
    checks.push({
      name: 'iOS Simulators',
      status: 'error',
      message: 'Could not list simulators',
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

  // Check iOS app build
  const appPath = join(PROJECT_ROOT, 'ios/App/build/Debug-iphonesimulator/App.app');
  if (existsSync(appPath)) {
    checks.push({
      name: 'iOS App Build',
      status: 'ok',
      message: 'App.app exists',
    });
  } else {
    checks.push({
      name: 'iOS App Build',
      status: 'error',
      message: 'App not built. Run build steps first.',
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
  console.log(chalk.blue.bold('\n🍎 iOS Integration Testing Agent\n'));
  console.log(chalk.gray('This agent verifies the environment and runs iOS tests.\n'));

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
  console.log('  1. Start Appium server: npx appium');
  console.log('  2. Boot iOS Simulator: xcrun simctl boot "iPhone 15"');
  console.log('  3. Run tests: npm run test:ios');
  console.log('  4. Analyze results and screenshots');
  console.log('');

  console.log(chalk.cyan('Ready for test execution.'));
}

main().catch(console.error);

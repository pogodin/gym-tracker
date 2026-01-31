#!/usr/bin/env node

/**
 * Firebase Test Lab Integration
 *
 * Runs integration tests on Firebase Test Lab using the free tier:
 * - 30 min/day on physical devices
 * - 60 min/day on virtual devices
 *
 * Prerequisites:
 * 1. Google Cloud SDK installed: https://cloud.google.com/sdk/docs/install
 * 2. Firebase project created
 * 3. Authenticated: gcloud auth login
 * 4. Project set: gcloud config set project <PROJECT_ID>
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadAllScenarios, getScenariosByTag } from '../parser.js';
import { scenarioToRoboScriptJson } from './converter.js';

const PROJECT_ROOT = join(process.cwd(), '..');
const E2E_ROOT = process.cwd();
const FIREBASE_DIR = join(E2E_ROOT, 'firebase-scripts');
const APK_PATH = join(PROJECT_ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk');

// Default test configuration
const DEFAULT_CONFIG = {
  // Virtual devices (free tier: 60 min/day)
  virtualDevices: [
    { model: 'MediumPhone.arm', version: '34' },
  ],
  // Physical devices (free tier: 30 min/day)
  physicalDevices: [
    { model: 'oriole', version: '33' }, // Pixel 6
  ],
  timeout: '5m',
  useVirtual: true, // Use virtual by default to preserve physical quota
};

interface TestResult {
  scenario: string;
  status: 'passed' | 'failed' | 'error';
  device: string;
  resultsUrl?: string;
  error?: string;
}

function checkPrerequisites(): boolean {
  console.log(chalk.bold('\n📋 Checking prerequisites...\n'));

  // Check gcloud CLI
  try {
    execSync('gcloud --version', { stdio: 'pipe' });
    console.log(chalk.green('  ✅ gcloud CLI installed'));
  } catch {
    console.log(chalk.red('  ❌ gcloud CLI not found'));
    console.log(chalk.gray('     Install: https://cloud.google.com/sdk/docs/install'));
    return false;
  }

  // Check authentication
  try {
    const account = execSync('gcloud config get-value account', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (account && account !== '(unset)') {
      console.log(chalk.green(`  ✅ Authenticated as ${account}`));
    } else {
      console.log(chalk.red('  ❌ Not authenticated'));
      console.log(chalk.gray('     Run: gcloud auth login'));
      return false;
    }
  } catch {
    console.log(chalk.red('  ❌ Authentication check failed'));
    return false;
  }

  // Check project
  try {
    const project = execSync('gcloud config get-value project', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (project && project !== '(unset)') {
      console.log(chalk.green(`  ✅ Project: ${project}`));
    } else {
      console.log(chalk.red('  ❌ No project set'));
      console.log(chalk.gray('     Run: gcloud config set project <PROJECT_ID>'));
      return false;
    }
  } catch {
    console.log(chalk.red('  ❌ Project check failed'));
    return false;
  }

  // Check APK
  if (existsSync(APK_PATH)) {
    console.log(chalk.green('  ✅ APK found'));
  } else {
    console.log(chalk.red('  ❌ APK not found at:'));
    console.log(chalk.gray(`     ${APK_PATH}`));
    console.log(chalk.gray('     Build with: cd android && ./gradlew assembleDebug'));
    return false;
  }

  return true;
}

async function convertScenariosToRoboScripts(): Promise<string[]> {
  console.log(chalk.bold('\n📝 Converting scenarios to Robo scripts...\n'));

  mkdirSync(FIREBASE_DIR, { recursive: true });

  const scenarios = await loadAllScenarios();
  const smokeTests = getScenariosByTag(scenarios, 'smoke');
  const scriptPaths: string[] = [];

  for (const [id, scenario] of smokeTests) {
    const json = scenarioToRoboScriptJson(scenario);
    const filename = `${id.replace(/\//g, '-')}.json`;
    const filepath = join(FIREBASE_DIR, filename);

    writeFileSync(filepath, json);
    scriptPaths.push(filepath);
    console.log(chalk.gray(`  Created: ${filename}`));
  }

  console.log(chalk.green(`\n  ✅ Converted ${scriptPaths.length} scenarios\n`));
  return scriptPaths;
}

function runFirebaseTest(
  scriptPath: string,
  device: { model: string; version: string },
  isVirtual: boolean
): Promise<TestResult> {
  return new Promise((resolve) => {
    const scenarioName = scriptPath.split('/').pop()?.replace('.json', '') || 'unknown';

    console.log(chalk.cyan(`\n▶ Running: ${scenarioName}`));
    console.log(chalk.gray(`  Device: ${device.model} (API ${device.version})`));
    console.log(chalk.gray(`  Type: ${isVirtual ? 'Virtual' : 'Physical'}`));

    const deviceFlag = isVirtual
      ? `--device model=${device.model},version=${device.version}`
      : `--device model=${device.model},version=${device.version}`;

    const command = [
      'gcloud', 'firebase', 'test', 'android', 'run',
      '--type', 'robo',
      '--app', APK_PATH,
      '--robo-script', scriptPath,
      deviceFlag,
      '--timeout', DEFAULT_CONFIG.timeout,
      '--format', 'json',
    ].join(' ');

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10 * 60 * 1000, // 10 minute timeout
      });

      // Parse results URL from output
      const urlMatch = output.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);

      console.log(chalk.green(`  ✅ Passed`));

      resolve({
        scenario: scenarioName,
        status: 'passed',
        device: `${device.model} (API ${device.version})`,
        resultsUrl: urlMatch?.[0],
      });
    } catch (error: any) {
      const stderr = error.stderr?.toString() || '';
      const stdout = error.stdout?.toString() || '';

      // Check if it's a test failure vs infrastructure error
      if (stderr.includes('FAILED') || stdout.includes('FAILED')) {
        console.log(chalk.red(`  ❌ Failed`));
        resolve({
          scenario: scenarioName,
          status: 'failed',
          device: `${device.model} (API ${device.version})`,
          error: 'Test assertions failed',
        });
      } else {
        console.log(chalk.red(`  ❌ Error: ${error.message}`));
        resolve({
          scenario: scenarioName,
          status: 'error',
          device: `${device.model} (API ${device.version})`,
          error: stderr || error.message,
        });
      }
    }
  });
}

function printResults(results: TestResult[]) {
  console.log(chalk.bold('\n═══════════════════════════════════════'));
  console.log(chalk.bold('         Firebase Test Lab Results'));
  console.log(chalk.bold('═══════════════════════════════════════\n'));

  const passed = results.filter((r) => r.status === 'passed');
  const failed = results.filter((r) => r.status === 'failed');
  const errors = results.filter((r) => r.status === 'error');

  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : '❌';
    const color = result.status === 'passed' ? chalk.green : chalk.red;

    console.log(`${icon} ${color(result.scenario)}`);
    console.log(chalk.gray(`   Device: ${result.device}`));
    if (result.resultsUrl) {
      console.log(chalk.blue(`   Results: ${result.resultsUrl}`));
    }
    if (result.error) {
      console.log(chalk.red(`   Error: ${result.error}`));
    }
    console.log('');
  }

  console.log(chalk.bold('Summary:'));
  console.log(`  Total: ${results.length}`);
  console.log(chalk.green(`  Passed: ${passed.length}`));
  if (failed.length > 0) console.log(chalk.red(`  Failed: ${failed.length}`));
  if (errors.length > 0) console.log(chalk.yellow(`  Errors: ${errors.length}`));
}

async function main() {
  console.log(chalk.blue.bold('\n🔥 Firebase Test Lab - Android Integration Tests\n'));

  // Parse args
  const args = process.argv.slice(2);
  const usePhysical = args.includes('--physical');

  if (usePhysical) {
    console.log(chalk.yellow('Using physical devices (30 min/day free tier)'));
  } else {
    console.log(chalk.gray('Using virtual devices (60 min/day free tier)'));
    console.log(chalk.gray('Use --physical flag for real devices'));
  }

  // Check prerequisites
  if (!checkPrerequisites()) {
    console.log(chalk.red('\n❌ Prerequisites not met. See above for details.\n'));
    process.exit(1);
  }

  // Convert scenarios
  const scriptPaths = await convertScenariosToRoboScripts();

  if (scriptPaths.length === 0) {
    console.log(chalk.yellow('No scenarios found with "smoke" tag'));
    process.exit(0);
  }

  // Run tests
  console.log(chalk.bold('\n🚀 Running tests on Firebase Test Lab...\n'));

  const devices = usePhysical
    ? DEFAULT_CONFIG.physicalDevices
    : DEFAULT_CONFIG.virtualDevices;

  const results: TestResult[] = [];

  for (const scriptPath of scriptPaths) {
    for (const device of devices) {
      const result = await runFirebaseTest(scriptPath, device, !usePhysical);
      results.push(result);
    }
  }

  // Print results
  printResults(results);

  // Exit with appropriate code
  const hasFailures = results.some((r) => r.status !== 'passed');
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

#!/usr/bin/env node

import { TestExecutor, formatResults } from '../executor.js';
import { loadAllScenarios, getScenariosByTag } from '../parser.js';
import { DEFAULT_ANDROID_CONFIG, TestResult } from '../types.js';
import chalk from 'chalk';

async function runAndroidTests() {
  console.log(chalk.green('\n🤖 Starting Android Integration Tests\n'));
  console.log(chalk.gray('Device:', DEFAULT_ANDROID_CONFIG.deviceName));
  console.log(chalk.gray('Platform Version:', DEFAULT_ANDROID_CONFIG.platformVersion));
  console.log(chalk.gray('Appium:', `${DEFAULT_ANDROID_CONFIG.appiumHost}:${DEFAULT_ANDROID_CONFIG.appiumPort}`));
  console.log('');

  const scenarios = await loadAllScenarios();
  const smokeTests = getScenariosByTag(scenarios, 'smoke');

  console.log(chalk.cyan(`Found ${smokeTests.size} smoke test scenarios\n`));

  const executor = new TestExecutor(DEFAULT_ANDROID_CONFIG);
  const results: TestResult[] = [];

  try {
    console.log(chalk.yellow('Initializing driver...'));
    await executor.initialize();
    console.log(chalk.green('Driver initialized ✓\n'));

    for (const [id, scenario] of smokeTests) {
      console.log(chalk.cyan(`▶ Running: ${scenario.name}`));
      console.log(chalk.gray(`  Scenario: ${id}`));

      const result = await executor.runScenario(scenario);
      results.push(result);

      if (result.status === 'passed') {
        console.log(chalk.green(`  ✅ Passed (${(result.duration / 1000).toFixed(2)}s)\n`));
      } else {
        console.log(chalk.red(`  ❌ Failed: ${result.error}\n`));
      }
    }
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
  } finally {
    console.log(chalk.yellow('Tearing down driver...'));
    await executor.teardown();
    console.log(chalk.green('Driver closed ✓'));
  }

  console.log(formatResults(results));

  const failed = results.filter((r) => r.status === 'failed');
  process.exit(failed.length > 0 ? 1 : 0);
}

runAndroidTests().catch(console.error);

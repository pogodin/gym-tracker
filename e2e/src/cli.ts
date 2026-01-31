#!/usr/bin/env node

import { TestExecutor, formatResults } from './executor.js';
import { loadAllScenarios, resolveDependencies } from './parser.js';
import { DEFAULT_IOS_CONFIG, DEFAULT_ANDROID_CONFIG, Platform, TestResult } from './types.js';
import chalk from 'chalk';

function printUsage() {
  console.log(`
${chalk.bold('Usage:')} npm run test:scenario -- [options]

${chalk.bold('Options:')}
  --platform, -p <ios|android>   Platform to test (required)
  --scenario, -s <id>            Scenario ID to run (e.g., "smoke-test", "templates/create-template")
  --tag, -t <tag>                Run all scenarios with tag
  --list, -l                     List all available scenarios
  --help, -h                     Show this help

${chalk.bold('Examples:')}
  npm run test:scenario -- -p ios -s smoke-test
  npm run test:scenario -- -p android -t smoke
  npm run test:scenario -- --list
`);
}

async function listScenarios() {
  const scenarios = await loadAllScenarios();

  console.log(chalk.bold('\nAvailable Scenarios:\n'));

  for (const [id, scenario] of scenarios) {
    const tags = scenario.tags?.length ? chalk.gray(`[${scenario.tags.join(', ')}]`) : '';
    console.log(`  ${chalk.cyan(id)}`);
    console.log(`    ${scenario.name} ${tags}`);
    if (scenario.requires?.length) {
      console.log(`    ${chalk.yellow('requires:')} ${scenario.requires.join(', ')}`);
    }
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    await listScenarios();
    process.exit(0);
  }

  // Parse arguments
  let platform: Platform | undefined;
  let scenarioId: string | undefined;
  let tag: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--platform':
      case '-p':
        platform = args[++i] as Platform;
        break;
      case '--scenario':
      case '-s':
        scenarioId = args[++i];
        break;
      case '--tag':
      case '-t':
        tag = args[++i];
        break;
    }
  }

  if (!platform) {
    console.error(chalk.red('Error: --platform is required'));
    printUsage();
    process.exit(1);
  }

  if (!scenarioId && !tag) {
    console.error(chalk.red('Error: --scenario or --tag is required'));
    printUsage();
    process.exit(1);
  }

  const config = platform === 'ios' ? DEFAULT_IOS_CONFIG : DEFAULT_ANDROID_CONFIG;
  const scenarios = await loadAllScenarios();

  // Determine which scenarios to run
  let scenarioIds: string[] = [];

  if (scenarioId) {
    scenarioIds = resolveDependencies(scenarios, scenarioId);
  } else if (tag) {
    for (const [id, scenario] of scenarios) {
      if (scenario.tags?.includes(tag)) {
        scenarioIds.push(id);
      }
    }
  }

  if (scenarioIds.length === 0) {
    console.error(chalk.red('No matching scenarios found'));
    process.exit(1);
  }

  console.log(chalk.bold(`\nRunning ${scenarioIds.length} scenario(s) on ${platform}\n`));
  console.log(chalk.gray('Scenarios:'), scenarioIds.join(', '));
  console.log('');

  const executor = new TestExecutor(config);
  const results: TestResult[] = [];

  try {
    await executor.initialize();

    for (const id of scenarioIds) {
      const scenario = scenarios.get(id);
      if (!scenario) continue;

      console.log(chalk.cyan(`▶ Running: ${scenario.name}`));
      const result = await executor.runScenario(scenario);
      results.push(result);

      if (result.status === 'passed') {
        console.log(chalk.green(`  ✅ Passed\n`));
      } else {
        console.log(chalk.red(`  ❌ Failed: ${result.error}\n`));
      }
    }
  } finally {
    await executor.teardown();
  }

  console.log(formatResults(results));

  const failed = results.filter((r) => r.status === 'failed');
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(console.error);

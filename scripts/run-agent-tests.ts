#!/usr/bin/env npx tsx
/**
 * CLI Entry Point for Agentic Integration Tests
 *
 * Usage:
 *   npm run test:agents                    # Run all scenarios
 *   npm run test:agents -- --scenario workout-flow.yaml
 *   npm run test:agents -- --tags smoke
 *   npm run test:agents -- --max-iterations 3
 *
 * This script runs the orchestrator which coordinates:
 * - Test Runner Agent: Executes scenarios in the browser
 * - Analyzer Agent: Diagnoses failures and suggests fixes
 * - Coding Agent: Applies fixes to source code
 *
 * The system iterates until all tests pass or max iterations is reached.
 */

import { join } from 'path';
import { existsSync } from 'fs';
import { runOrchestrator, loadConfig } from '../e2e/agents/orchestrator.js';
import type { AgentConfig } from '../e2e/lib/types.js';

interface CLIArgs {
  scenario?: string;
  tags?: string[];
  maxIterations?: number;
  baseUrl?: string;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--scenario':
      case '-s':
        args.scenario = argv[++i];
        break;

      case '--tags':
      case '-t':
        args.tags = argv[++i]?.split(',');
        break;

      case '--max-iterations':
      case '-m':
        args.maxIterations = parseInt(argv[++i], 10);
        break;

      case '--base-url':
      case '-u':
        args.baseUrl = argv[++i];
        break;

      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Agentic Integration Test Runner

Usage:
  npm run test:agents [options]

Options:
  -s, --scenario <file>      Run a specific scenario file
  -t, --tags <tags>          Filter scenarios by tags (comma-separated)
  -m, --max-iterations <n>   Maximum fix iterations (default: 5)
  -u, --base-url <url>       Base URL for the app (default: http://localhost:5173)
  -h, --help                 Show this help message

Examples:
  npm run test:agents
  npm run test:agents -- --scenario workout-flow.yaml
  npm run test:agents -- --tags smoke,critical
  npm run test:agents -- --max-iterations 3

The system will:
1. Load test scenarios from e2e/scenarios/
2. Execute each scenario using Playwright
3. On failure, analyze the error and suggest fixes
4. Apply fixes automatically (if configured)
5. Re-run failed scenarios until pass or max iterations
6. Generate reports in e2e/reports/
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const projectRoot = process.cwd();

  // Verify we're in the right directory
  if (!existsSync(join(projectRoot, 'e2e/scenarios'))) {
    console.error('Error: e2e/scenarios directory not found.');
    console.error('Make sure you run this from the gym-tracker project root.');
    process.exit(1);
  }

  // Load config
  const config = loadConfig(join(projectRoot, 'e2e/agents/config.yaml'));

  // Apply CLI overrides
  if (args.maxIterations) {
    config.orchestrator.maxIterations = args.maxIterations;
  }
  if (args.baseUrl) {
    config.testRunner.baseUrl = args.baseUrl;
  }

  console.log('Starting Agentic Integration Tests...\n');
  console.log(`Configuration:`);
  console.log(`  Max iterations: ${config.orchestrator.maxIterations}`);
  console.log(`  Base URL: ${config.testRunner.baseUrl}`);
  console.log(`  Auto-apply fixes: ${config.codingAgent.autoApply}`);
  if (args.scenario) {
    console.log(`  Scenario filter: ${args.scenario}`);
  }
  if (args.tags) {
    console.log(`  Tag filter: ${args.tags.join(', ')}`);
  }

  try {
    const result = await runOrchestrator({
      scenariosDir: join(projectRoot, 'e2e/scenarios'),
      screenshotDir: join(projectRoot, 'e2e/screenshots'),
      reportsDir: join(projectRoot, 'e2e/reports'),
      projectRoot,
      config,
      tags: args.tags,
    });

    if (result.success) {
      console.log('\n All tests passed!');
      process.exit(0);
    } else {
      console.log('\n Some tests failed.');

      // If there are coding agent prompts, output them for potential manual fixing
      if (result.codingAgentPrompts.length > 0) {
        console.log('\n--- Coding Agent Prompts for Manual Fixing ---');
        console.log('Use these prompts with Claude Code to apply fixes:\n');
        for (let i = 0; i < result.codingAgentPrompts.length; i++) {
          console.log(`--- Fix ${i + 1} ---`);
          console.log(result.codingAgentPrompts[i].substring(0, 500) + '...');
          console.log('');
        }
      }

      process.exit(1);
    }
  } catch (err) {
    console.error('\nFatal error:', err);
    process.exit(1);
  }
}

main();

/**
 * Test Runner Agent
 *
 * Responsibilities:
 * - Parse YAML scenario files
 * - Translate to Playwright actions
 * - Capture screenshots at each step
 * - Record console errors and network failures
 * - Generate structured test reports
 *
 * This agent is spawned by the Orchestrator and runs scenarios in the browser.
 */

import { join } from 'path';
import { parseScenarioFile, validateScenario, getScenarioSummary } from '../lib/scenarioParser.js';
import { PlaywrightAdapter } from '../lib/playwrightAdapter.js';
import { generateTestResultReport } from '../lib/reportGenerator.js';
import type { Scenario, TestResult, TestRunnerConfig } from '../lib/types.js';

export interface TestRunnerInput {
  scenarioFile: string;
  scenariosDir: string;
  screenshotDir: string;
  reportsDir: string;
  config: TestRunnerConfig;
}

export interface TestRunnerOutput {
  success: boolean;
  result: TestResult;
  reportPath: string;
  error?: string;
}

export async function runTestRunner(input: TestRunnerInput): Promise<TestRunnerOutput> {
  const { scenarioFile, scenariosDir, screenshotDir, reportsDir, config } = input;

  console.log(`\n[Test Runner] Starting scenario: ${scenarioFile}`);

  // Parse the scenario file
  const scenarioPath = join(scenariosDir, scenarioFile);
  let scenario: Scenario;

  try {
    scenario = parseScenarioFile(scenarioPath);
    console.log(`[Test Runner] Loaded: ${getScenarioSummary(scenario)}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Test Runner] Failed to parse scenario: ${error}`);
    return {
      success: false,
      result: createFailedResult(scenarioFile, error),
      reportPath: '',
      error,
    };
  }

  // Validate the scenario
  const validationErrors = validateScenario(scenario);
  if (validationErrors.length > 0) {
    const error = `Validation errors:\n${validationErrors.map((e) => `  - ${e}`).join('\n')}`;
    console.error(`[Test Runner] ${error}`);
    return {
      success: false,
      result: createFailedResult(scenarioFile, error),
      reportPath: '',
      error,
    };
  }

  // Initialize Playwright adapter
  const adapter = new PlaywrightAdapter(config);
  let result: TestResult;

  try {
    await adapter.initialize();
    console.log(`[Test Runner] Browser initialized`);

    // Run the scenario
    const scenarioScreenshotDir = join(screenshotDir, scenarioFile.replace('.yaml', ''));
    result = await adapter.runScenario(scenario, scenarioFile, scenarioScreenshotDir);

    // Log step results
    for (const step of result.steps) {
      const icon = step.status === 'passed' ? '  ✓' : step.status === 'failed' ? '  ✗' : '  ○';
      console.log(`${icon} ${step.id}`);
      if (step.error) {
        console.log(`      Error: ${step.error}`);
      }
    }

    console.log(`\n[Test Runner] Result: ${result.status.toUpperCase()} (${result.duration}ms)`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Test Runner] Execution error: ${error}`);
    result = createFailedResult(scenarioFile, error);
  } finally {
    await adapter.cleanup();
    console.log(`[Test Runner] Browser closed`);
  }

  // Generate report
  const reportPath = generateTestResultReport(result, reportsDir);
  console.log(`[Test Runner] Report saved: ${reportPath}`);

  return {
    success: result.status === 'passed',
    result,
    reportPath,
  };
}

function createFailedResult(scenarioFile: string, error: string): TestResult {
  return {
    scenario: scenarioFile,
    scenarioFile,
    status: 'failed',
    duration: 0,
    steps: [],
    screenshots: [],
    consoleErrors: [error],
    networkErrors: [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standalone execution for testing
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx tsx e2e/agents/testRunner.ts <scenario-file>');
    process.exit(1);
  }

  const scenarioFile = args[0];
  const result = await runTestRunner({
    scenarioFile,
    scenariosDir: 'e2e/scenarios',
    screenshotDir: 'e2e/screenshots',
    reportsDir: 'e2e/reports',
    config: {
      baseUrl: 'http://localhost:5173',
      timeout: 30000,
      screenshotOnFailure: true,
      screenshotOnStep: true,
      video: false,
    },
  });

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

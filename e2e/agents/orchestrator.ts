/**
 * Orchestrator Agent
 *
 * Responsibilities:
 * - Coordinate the test-fix loop workflow
 * - Manage state across iterations
 * - Dispatch to specialized agents (Test Runner, Analyzer, Coding Agent)
 * - Generate final reports
 *
 * This is the main coordinator that runs scenarios and manages the
 * feedback loop until all tests pass or max iterations is reached.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadAllScenarios, getScenarioSummary } from '../lib/scenarioParser.js';
import { generateFinalReport, printSummary } from '../lib/reportGenerator.js';
import { runTestRunner } from './testRunner.js';
import { runAnalyzer } from './analyzer.js';
import { runCodingAgent, generateCodingAgentPrompt } from './codingAgent.js';
import type {
  OrchestratorState,
  AgentConfig,
  Scenario,
  TestResult,
  Analysis,
  Fix,
} from '../lib/types.js';

export interface OrchestratorInput {
  scenariosDir: string;
  screenshotDir: string;
  reportsDir: string;
  projectRoot: string;
  config: AgentConfig;
  tags?: string[];
}

export interface OrchestratorOutput {
  success: boolean;
  state: OrchestratorState;
  codingAgentPrompts: string[]; // Prompts for Claude Code subagents to apply fixes
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const { scenariosDir, screenshotDir, reportsDir, projectRoot, config } = input;

  console.log('\n========================================');
  console.log('   AGENTIC INTEGRATION TEST RUNNER');
  console.log('========================================\n');

  // Initialize state
  const state: OrchestratorState = {
    scenarios: [],
    currentScenario: null,
    iteration: 0,
    maxIterations: config.orchestrator.maxIterations,
    results: [],
    analyses: [],
    fixes: [],
    status: 'initializing',
    startTime: new Date().toISOString(),
  };

  // Ensure directories exist
  ensureDirectories([screenshotDir, reportsDir]);

  // Load scenarios
  console.log('Loading scenarios...');
  const scenarioMap = loadAllScenarios(scenariosDir);
  state.scenarios = Array.from(scenarioMap.values());

  if (state.scenarios.length === 0) {
    console.log('No scenarios found!');
    state.status = 'failed';
    return { success: false, state, codingAgentPrompts: [] };
  }

  console.log(`Found ${state.scenarios.length} scenario(s):`);
  for (const [file, scenario] of scenarioMap) {
    console.log(`  - ${getScenarioSummary(scenario)} [${file}]`);
  }

  state.status = 'running';
  const codingAgentPrompts: string[] = [];

  // Process each scenario
  for (const [scenarioFile, scenario] of scenarioMap) {
    console.log(`\n----------------------------------------`);
    console.log(`Scenario: ${scenario.name}`);
    console.log(`----------------------------------------`);

    state.currentScenario = scenario.name;
    let passed = false;
    let iteration = 0;

    while (!passed && iteration < config.orchestrator.maxIterations) {
      iteration++;
      state.iteration = iteration;

      console.log(`\n[Iteration ${iteration}/${config.orchestrator.maxIterations}]`);

      // Run the test
      const testResult = await runTestRunner({
        scenarioFile,
        scenariosDir,
        screenshotDir,
        reportsDir,
        config: config.testRunner,
      });

      state.results.push(testResult.result);

      if (testResult.success) {
        console.log(`\n[PASSED] ${scenario.name}`);
        passed = true;
        break;
      }

      console.log(`\n[FAILED] ${scenario.name}`);

      // Don't analyze/fix on last iteration
      if (iteration >= config.orchestrator.maxIterations) {
        console.log('[Max iterations reached - no more fix attempts]');
        break;
      }

      // Analyze the failure
      const analysisResult = await runAnalyzer({
        testResult: testResult.result,
        projectRoot,
        reportsDir,
        config: config.analyzer,
      });

      state.analyses.push(analysisResult.analysis);

      // Generate prompt for coding agent
      const codingPrompt = generateCodingAgentPrompt(analysisResult.analysis, projectRoot);
      codingAgentPrompts.push(codingPrompt);

      // If auto-apply is enabled, run the coding agent
      if (config.codingAgent.autoApply) {
        const fixResult = await runCodingAgent({
          analysis: analysisResult.analysis,
          projectRoot,
          reportsDir,
          config: config.codingAgent,
        });

        state.fixes.push(fixResult.fix);

        if (!fixResult.success) {
          console.log('[Warning] Fix may have introduced TypeScript errors');
        }
      }

      // Stop on first failure if configured
      if (config.orchestrator.stopOnFirstFailure && !passed) {
        console.log('[stopOnFirstFailure enabled - stopping]');
        break;
      }
    }

    if (!passed) {
      state.status = iteration >= config.orchestrator.maxIterations ? 'max_retries' : 'failed';

      if (config.orchestrator.stopOnFirstFailure) {
        break;
      }
    }
  }

  // Determine final status
  const allPassed = state.results.length > 0 &&
    state.results.every((r) => r.status === 'passed');

  if (allPassed) {
    state.status = 'passed';
  } else if (state.status === 'running') {
    state.status = 'failed';
  }

  state.endTime = new Date().toISOString();

  // Generate final report
  const finalReport = generateFinalReport(state, reportsDir);
  printSummary(finalReport);

  return {
    success: state.status === 'passed',
    state,
    codingAgentPrompts,
  };
}

function ensureDirectories(dirs: string[]): void {
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Load configuration from YAML file or use defaults
 */
export function loadConfig(configPath?: string): AgentConfig {
  // Default configuration
  const defaultConfig: AgentConfig = {
    orchestrator: {
      maxIterations: 5,
      parallelScenarios: false,
      stopOnFirstFailure: false,
    },
    testRunner: {
      baseUrl: 'http://localhost:5173',
      timeout: 30000,
      screenshotOnFailure: true,
      screenshotOnStep: true,
      video: false,
    },
    analyzer: {
      confidenceThreshold: 0.7,
      maxSuggestions: 3,
    },
    codingAgent: {
      autoApply: true,
      maxFilesPerFix: 3,
      validateTypescript: true,
    },
  };

  if (configPath && existsSync(configPath)) {
    try {
      // Dynamic import for yaml - will be loaded at runtime
      // For now, just use defaults
      console.log(`[Config] Using defaults (config file parsing not implemented)`);
    } catch {
      console.log(`[Config] Failed to load ${configPath}, using defaults`);
    }
  }

  return defaultConfig;
}

/**
 * Standalone execution
 */
export async function main(): Promise<void> {
  const projectRoot = process.cwd();

  const config = loadConfig(join(projectRoot, 'e2e/agents/config.yaml'));

  const result = await runOrchestrator({
    scenariosDir: join(projectRoot, 'e2e/scenarios'),
    screenshotDir: join(projectRoot, 'e2e/screenshots'),
    reportsDir: join(projectRoot, 'e2e/reports'),
    projectRoot,
    config,
  });

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

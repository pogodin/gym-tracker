/**
 * Analyzer Agent
 *
 * Responsibilities:
 * - Parse test results and screenshots
 * - Identify failure patterns and root causes
 * - Map errors to likely source files
 * - Generate fix suggestions with confidence levels
 *
 * This agent is spawned by the Orchestrator when tests fail.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateAnalysisReport } from '../lib/reportGenerator.js';
import type { TestResult, StepResult, Analysis, FailureCategory, AnalyzerConfig } from '../lib/types.js';

export interface AnalyzerInput {
  testResult: TestResult;
  projectRoot: string;
  reportsDir: string;
  config: AnalyzerConfig;
}

export interface AnalyzerOutput {
  analysis: Analysis;
  reportPath: string;
}

// Pattern definitions for identifying failure categories
const FAILURE_PATTERNS: {
  pattern: RegExp;
  category: FailureCategory;
  getMessage: (match: RegExpMatchArray) => string;
}[] = [
  {
    pattern: /Could not find (?:clickable|fillable) element: (.+)/i,
    category: 'selector',
    getMessage: (m) => `Element "${m[1]}" not found - selector may be incorrect or element not rendered`,
  },
  {
    pattern: /Expected "(.+)" to be visible/i,
    category: 'selector',
    getMessage: (m) => `Element "${m[1]}" not visible - may not be rendered or wrong selector`,
  },
  {
    pattern: /Timeout/i,
    category: 'timing',
    getMessage: () => 'Operation timed out - async operation may be slow or not completing',
  },
  {
    pattern: /Expected (?:URL|url) to (?:be|contain) "(.+)" but got "(.+)"/i,
    category: 'state',
    getMessage: (m) => `Navigation issue: expected "${m[1]}" but at "${m[2]}"`,
  },
  {
    pattern: /Expected input value to be "(.+)" but got "(.+)"/i,
    category: 'state',
    getMessage: (m) => `State mismatch: expected "${m[1]}" but got "${m[2]}"`,
  },
  {
    pattern: /Page Error: (.+)/i,
    category: 'logic',
    getMessage: (m) => `JavaScript error: ${m[1]}`,
  },
  {
    pattern: /NetworkError|Failed to fetch|net::ERR/i,
    category: 'network',
    getMessage: () => 'Network request failed',
  },
];

// File mapping patterns - maps UI elements to likely source files
const FILE_MAPPINGS: { pattern: RegExp; files: string[] }[] = [
  {
    pattern: /template/i,
    files: ['src/pages/TemplatePage.tsx', 'src/components/templates/TemplateForm.tsx', 'src/components/templates/TemplateList.tsx'],
  },
  {
    pattern: /workout|exercise|set/i,
    files: ['src/pages/HomePage.tsx', 'src/components/workout/ExerciseCard.tsx', 'src/components/workout/ExerciseList.tsx', 'src/stores/workoutStore.ts'],
  },
  {
    pattern: /history|session/i,
    files: ['src/pages/HistoryPage.tsx', 'src/components/history/HistoryList.tsx', 'src/components/history/SessionDetail.tsx'],
  },
  {
    pattern: /settings/i,
    files: ['src/pages/SettingsPage.tsx'],
  },
  {
    pattern: /button|click|modal/i,
    files: ['src/components/common/Button.tsx', 'src/components/common/Modal.tsx'],
  },
  {
    pattern: /input|fill|form/i,
    files: ['src/components/common/Input.tsx'],
  },
  {
    pattern: /navigate|url|route/i,
    files: ['src/App.tsx'],
  },
];

export async function runAnalyzer(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const { testResult, projectRoot, reportsDir } = input;

  console.log(`\n[Analyzer] Analyzing failed scenario: ${testResult.scenario}`);

  // Find the failed step
  const failedStep = testResult.steps.find((s) => s.status === 'failed');
  if (!failedStep) {
    throw new Error('No failed step found in test result');
  }

  console.log(`[Analyzer] Failed step: ${failedStep.id}`);
  console.log(`[Analyzer] Error: ${failedStep.error}`);

  // Determine failure category and root cause
  const { category, rootCause } = analyzeError(failedStep, testResult);
  console.log(`[Analyzer] Category: ${category}`);
  console.log(`[Analyzer] Root cause: ${rootCause}`);

  // Identify affected files
  const affectedFiles = identifyAffectedFiles(failedStep, projectRoot);
  console.log(`[Analyzer] Affected files: ${affectedFiles.join(', ')}`);

  // Generate fix suggestion
  const suggestedFix = generateFixSuggestion(failedStep, category, rootCause, affectedFiles);
  console.log(`[Analyzer] Suggested fix: ${suggestedFix}`);

  // Determine confidence level
  const confidence = determineConfidence(category, affectedFiles, failedStep);
  console.log(`[Analyzer] Confidence: ${confidence}`);

  const analysis: Analysis = {
    scenario: testResult.scenario,
    scenarioFile: testResult.scenarioFile,
    failedStep: `${failedStep.action} on "${failedStep.target}"`,
    failedStepId: failedStep.id,
    rootCause,
    category,
    affectedFiles,
    suggestedFix,
    confidence,
    timestamp: new Date().toISOString(),
  };

  // Generate report
  const reportPath = generateAnalysisReport(analysis, reportsDir);
  console.log(`[Analyzer] Report saved: ${reportPath}`);

  return { analysis, reportPath };
}

function analyzeError(
  failedStep: StepResult,
  testResult: TestResult
): { category: FailureCategory; rootCause: string } {
  const error = failedStep.error ?? '';

  // Check console errors first
  if (testResult.consoleErrors.length > 0) {
    const jsError = testResult.consoleErrors.find((e) => e.includes('Error'));
    if (jsError) {
      return {
        category: 'logic',
        rootCause: `JavaScript error: ${jsError.substring(0, 200)}`,
      };
    }
  }

  // Check network errors
  if (testResult.networkErrors.length > 0) {
    return {
      category: 'network',
      rootCause: `Network failure: ${testResult.networkErrors[0]}`,
    };
  }

  // Match against known patterns
  for (const { pattern, category, getMessage } of FAILURE_PATTERNS) {
    const match = error.match(pattern);
    if (match) {
      return { category, rootCause: getMessage(match) };
    }
  }

  // Default fallback
  return {
    category: 'selector',
    rootCause: error || 'Unknown error - step failed without specific error message',
  };
}

function identifyAffectedFiles(failedStep: StepResult, projectRoot: string): string[] {
  const files: string[] = [];
  const target = failedStep.target.toLowerCase();
  const stepId = failedStep.id.toLowerCase();
  const searchTerms = `${target} ${stepId}`;

  // Match against file mappings
  for (const { pattern, files: mappedFiles } of FILE_MAPPINGS) {
    if (pattern.test(searchTerms)) {
      for (const file of mappedFiles) {
        const fullPath = join(projectRoot, file);
        if (existsSync(fullPath) && !files.includes(file)) {
          files.push(file);
        }
      }
    }
  }

  // If no matches, return general files based on the step type
  if (files.length === 0) {
    // Default to main app and common components
    const defaultFiles = [
      'src/App.tsx',
      'src/pages/HomePage.tsx',
    ];
    for (const file of defaultFiles) {
      const fullPath = join(projectRoot, file);
      if (existsSync(fullPath)) {
        files.push(file);
      }
    }
  }

  return files.slice(0, 5); // Limit to 5 files
}

function generateFixSuggestion(
  failedStep: StepResult,
  category: FailureCategory,
  rootCause: string,
  affectedFiles: string[]
): string {
  switch (category) {
    case 'selector':
      return `Check and update the selector for "${failedStep.target}" in ${affectedFiles[0] || 'the relevant component'}. The element may have a different class, id, or text content. Consider using data-testid attributes for more reliable selectors.`;

    case 'timing':
      return `Add explicit wait conditions before the "${failedStep.action}" action. The element may be loading asynchronously. Consider using Playwright's auto-waiting features or adding a waitForSelector call.`;

    case 'state':
      return `Verify the application state before step "${failedStep.id}". The expected state "${failedStep.expectedValue}" doesn't match actual "${failedStep.actualValue}". Check the state management logic in ${affectedFiles[0] || 'the store/hooks'}.`;

    case 'logic':
      return `Fix the JavaScript error in ${affectedFiles[0] || 'the application code'}. ${rootCause}. Review the component logic and error boundaries.`;

    case 'network':
      return `Check the API endpoint and network handling. Ensure the backend is running and the endpoint is accessible. Consider adding error handling for failed requests.`;

    default:
      return `Review the implementation in ${affectedFiles.join(', ')} to address: ${rootCause}`;
  }
}

function determineConfidence(
  category: FailureCategory,
  affectedFiles: string[],
  failedStep: StepResult
): 'high' | 'medium' | 'low' {
  // High confidence: clear error message, files identified
  if (affectedFiles.length > 0 && affectedFiles.length <= 2) {
    if (category === 'selector' && failedStep.target) {
      return 'high';
    }
    if (category === 'logic' && failedStep.error?.includes('Error')) {
      return 'high';
    }
  }

  // Medium confidence: some info available
  if (affectedFiles.length > 0 || failedStep.error) {
    return 'medium';
  }

  // Low confidence: little information
  return 'low';
}

/**
 * Standalone execution for testing
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx tsx e2e/agents/analyzer.ts <test-result-file>');
    process.exit(1);
  }

  const resultFile = args[0];
  const testResult: TestResult = JSON.parse(readFileSync(resultFile, 'utf-8'));

  const result = await runAnalyzer({
    testResult,
    projectRoot: process.cwd(),
    reportsDir: 'e2e/reports',
    config: {
      confidenceThreshold: 0.7,
      maxSuggestions: 3,
    },
  });

  console.log('\n[Analyzer] Analysis complete');
  console.log(JSON.stringify(result.analysis, null, 2));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

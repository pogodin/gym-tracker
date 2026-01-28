// Core types for the agentic integration testing infrastructure

// ============ Scenario Types ============

export interface Scenario {
  name: string;
  description: string;
  preconditions: string[];
  steps: ScenarioStep[];
  postconditions: string[];
  tags: string[];
}

export interface ScenarioStep {
  id: string;
  action: ActionType;
  target: string;
  value?: string;
  expect?: Expectation[];
}

export type ActionType = 'click' | 'fill' | 'select' | 'hover' | 'wait' | 'screenshot' | 'navigate';

export interface Expectation {
  type: ExpectationType;
  value: string;
}

export type ExpectationType =
  | 'url'
  | 'url_contains'
  | 'visible'
  | 'not_visible'
  | 'input_value'
  | 'text_content'
  | 'element_count';

// ============ Test Result Types ============

export interface TestResult {
  scenario: string;
  scenarioFile: string;
  status: 'passed' | 'failed';
  duration: number;
  steps: StepResult[];
  screenshots: string[];
  consoleErrors: string[];
  networkErrors: string[];
  timestamp: string;
}

export interface StepResult {
  id: string;
  action: ActionType;
  target: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
  actualValue?: string;
  expectedValue?: string;
}

// ============ Analysis Types ============

export interface Analysis {
  scenario: string;
  scenarioFile: string;
  failedStep: string;
  failedStepId: string;
  rootCause: string;
  category: FailureCategory;
  affectedFiles: string[];
  suggestedFix: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

export type FailureCategory =
  | 'selector'    // Element not found - selector issue or missing UI
  | 'timing'      // Timeout - async loading issue
  | 'state'       // Wrong value - state management bug
  | 'logic'       // Console error - JavaScript exception
  | 'network';    // Network failure

// ============ Fix Types ============

export interface Fix {
  analysis: Analysis;
  filesModified: FileModification[];
  typescriptValid: boolean;
  timestamp: string;
}

export interface FileModification {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  changes: string; // Human-readable diff description
}

// ============ Orchestrator Types ============

export interface OrchestratorState {
  scenarios: Scenario[];
  currentScenario: string | null;
  iteration: number;
  maxIterations: number;
  results: TestResult[];
  analyses: Analysis[];
  fixes: Fix[];
  status: OrchestratorStatus;
  startTime: string;
  endTime?: string;
}

export type OrchestratorStatus =
  | 'initializing'
  | 'running'
  | 'passed'
  | 'failed'
  | 'max_retries';

// ============ Configuration Types ============

export interface AgentConfig {
  orchestrator: OrchestratorConfig;
  testRunner: TestRunnerConfig;
  analyzer: AnalyzerConfig;
  codingAgent: CodingAgentConfig;
}

export interface OrchestratorConfig {
  maxIterations: number;
  parallelScenarios: boolean;
  stopOnFirstFailure: boolean;
}

export interface TestRunnerConfig {
  baseUrl: string;
  timeout: number;
  screenshotOnFailure: boolean;
  screenshotOnStep: boolean;
  video: boolean;
}

export interface AnalyzerConfig {
  confidenceThreshold: number;
  maxSuggestions: number;
}

export interface CodingAgentConfig {
  autoApply: boolean;
  maxFilesPerFix: number;
  validateTypescript: boolean;
}

// ============ Report Types ============

export interface FinalReport {
  summary: ReportSummary;
  scenarios: ScenarioReport[];
  fixes: Fix[];
  timestamp: string;
  duration: number;
}

export interface ReportSummary {
  totalScenarios: number;
  passed: number;
  failed: number;
  iterations: number;
  fixesApplied: number;
}

export interface ScenarioReport {
  name: string;
  file: string;
  status: 'passed' | 'failed';
  iterations: number;
  results: TestResult[];
  analyses: Analysis[];
  fixes: Fix[];
}

// ============ YAML Parsing Types ============

export interface RawScenario {
  name: string;
  description: string;
  preconditions?: string[];
  steps: RawStep[];
  postconditions?: string[];
  tags?: string[];
}

export interface RawStep {
  id: string;
  action: string;
  target: string;
  value?: string;
  expect?: (string | Record<string, string>)[];
}

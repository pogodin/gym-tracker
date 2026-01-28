import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  TestResult,
  Analysis,
  Fix,
  FinalReport,
  ReportSummary,
  ScenarioReport,
  OrchestratorState,
} from './types.js';

export function generateTestResultReport(result: TestResult, outputDir: string): string {
  const fileName = `${result.scenarioFile.replace('.yaml', '')}-${Date.now()}.json`;
  const filePath = join(outputDir, fileName);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(result, null, 2));
  return filePath;
}

export function generateAnalysisReport(analysis: Analysis, outputDir: string): string {
  const fileName = `analysis-${analysis.scenarioFile.replace('.yaml', '')}-${Date.now()}.json`;
  const filePath = join(outputDir, fileName);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(analysis, null, 2));
  return filePath;
}

export function generateFixReport(fix: Fix, outputDir: string): string {
  const fileName = `fix-${fix.analysis.scenarioFile.replace('.yaml', '')}-${Date.now()}.json`;
  const filePath = join(outputDir, fileName);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(fix, null, 2));
  return filePath;
}

export function generateFinalReport(state: OrchestratorState, outputDir: string): FinalReport {
  const endTime = new Date().toISOString();
  const startDate = new Date(state.startTime);
  const endDate = new Date(endTime);
  const duration = endDate.getTime() - startDate.getTime();

  // Group results by scenario
  const scenarioReports = new Map<string, ScenarioReport>();

  for (const result of state.results) {
    const key = result.scenarioFile;
    if (!scenarioReports.has(key)) {
      const scenario = state.scenarios.find((s) => s.name === result.scenario);
      scenarioReports.set(key, {
        name: result.scenario,
        file: result.scenarioFile,
        status: 'failed',
        iterations: 0,
        results: [],
        analyses: [],
        fixes: [],
      });
    }

    const report = scenarioReports.get(key)!;
    report.results.push(result);
    report.iterations++;
    if (result.status === 'passed') {
      report.status = 'passed';
    }
  }

  // Add analyses to scenario reports
  for (const analysis of state.analyses) {
    const report = scenarioReports.get(analysis.scenarioFile);
    if (report) {
      report.analyses.push(analysis);
    }
  }

  // Add fixes to scenario reports
  for (const fix of state.fixes) {
    const report = scenarioReports.get(fix.analysis.scenarioFile);
    if (report) {
      report.fixes.push(fix);
    }
  }

  // Calculate summary
  const scenarios = Array.from(scenarioReports.values());
  const summary: ReportSummary = {
    totalScenarios: scenarios.length,
    passed: scenarios.filter((s) => s.status === 'passed').length,
    failed: scenarios.filter((s) => s.status === 'failed').length,
    iterations: state.iteration,
    fixesApplied: state.fixes.length,
  };

  const finalReport: FinalReport = {
    summary,
    scenarios,
    fixes: state.fixes,
    timestamp: endTime,
    duration,
  };

  // Write report to file
  const reportPath = join(outputDir, `final-report-${Date.now()}.json`);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

  // Also generate a human-readable summary
  const summaryPath = join(outputDir, `summary-${Date.now()}.txt`);
  writeFileSync(summaryPath, formatReportSummary(finalReport));

  return finalReport;
}

function formatReportSummary(report: FinalReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    AGENTIC TEST REPORT                        ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`Total Scenarios: ${report.summary.totalScenarios}`);
  lines.push(`Passed: ${report.summary.passed}`);
  lines.push(`Failed: ${report.summary.failed}`);
  lines.push(`Iterations: ${report.summary.iterations}`);
  lines.push(`Fixes Applied: ${report.summary.fixesApplied}`);
  lines.push('');
  lines.push('SCENARIO DETAILS');
  lines.push('───────────────────────────────────────────────────────────────');

  for (const scenario of report.scenarios) {
    const statusIcon = scenario.status === 'passed' ? '✓' : '✗';
    lines.push(`${statusIcon} ${scenario.name} (${scenario.file})`);
    lines.push(`  Iterations: ${scenario.iterations}`);
    lines.push(`  Status: ${scenario.status.toUpperCase()}`);

    if (scenario.analyses.length > 0) {
      lines.push('  Analyses:');
      for (const analysis of scenario.analyses) {
        lines.push(`    - Step: ${analysis.failedStepId}`);
        lines.push(`      Category: ${analysis.category}`);
        lines.push(`      Root Cause: ${analysis.rootCause}`);
        lines.push(`      Confidence: ${analysis.confidence}`);
      }
    }

    if (scenario.fixes.length > 0) {
      lines.push('  Fixes Applied:');
      for (const fix of scenario.fixes) {
        for (const mod of fix.filesModified) {
          lines.push(`    - ${mod.filePath}`);
          lines.push(`      ${mod.changes}`);
        }
      }
    }

    lines.push('');
  }

  if (report.summary.failed > 0) {
    lines.push('REMAINING FAILURES');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const scenario of report.scenarios.filter((s) => s.status === 'failed')) {
      const lastResult = scenario.results[scenario.results.length - 1];
      const failedStep = lastResult.steps.find((s) => s.status === 'failed');
      if (failedStep) {
        lines.push(`${scenario.name}:`);
        lines.push(`  Step: ${failedStep.id}`);
        lines.push(`  Error: ${failedStep.error}`);
        lines.push('');
      }
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function printProgress(
  scenarioName: string,
  iteration: number,
  maxIterations: number,
  stepId: string,
  status: 'passed' | 'failed' | 'running'
): void {
  const statusIcon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '▶';
  console.log(`[${iteration}/${maxIterations}] ${scenarioName} > ${stepId}: ${statusIcon}`);
}

export function printSummary(report: FinalReport): void {
  console.log('\n' + formatReportSummary(report));
}

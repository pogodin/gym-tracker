/**
 * Coding Agent
 *
 * Responsibilities:
 * - Read analysis reports from the Analyzer Agent
 * - Read affected source files
 * - Apply minimal targeted fixes
 * - Validate TypeScript syntax
 * - Report changes made
 *
 * This agent is spawned by the Orchestrator after analysis is complete.
 * It uses Claude Code subagent capabilities to apply fixes.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { generateFixReport } from '../lib/reportGenerator.js';
import type { Analysis, Fix, FileModification, CodingAgentConfig } from '../lib/types.js';

export interface CodingAgentInput {
  analysis: Analysis;
  projectRoot: string;
  reportsDir: string;
  config: CodingAgentConfig;
}

export interface CodingAgentOutput {
  success: boolean;
  fix: Fix;
  reportPath: string;
  error?: string;
}

/**
 * Run the Coding Agent to apply fixes based on analysis.
 *
 * In the agentic system, this function is called by the orchestrator
 * which spawns a Claude Code subagent to actually apply the fix.
 * The subagent has access to the codebase and can make intelligent fixes.
 *
 * This implementation provides the structure for tracking fixes,
 * but the actual fix application is done by the Claude Code subagent
 * through the Task tool with appropriate prompts.
 */
export async function runCodingAgent(input: CodingAgentInput): Promise<CodingAgentOutput> {
  const { analysis, projectRoot, reportsDir, config } = input;

  console.log(`\n[Coding Agent] Processing fix for: ${analysis.scenario}`);
  console.log(`[Coding Agent] Failed step: ${analysis.failedStepId}`);
  console.log(`[Coding Agent] Category: ${analysis.category}`);
  console.log(`[Coding Agent] Suggested fix: ${analysis.suggestedFix}`);

  const filesModified: FileModification[] = [];
  let typescriptValid = true;

  // Read affected files
  for (const file of analysis.affectedFiles.slice(0, config.maxFilesPerFix)) {
    const filePath = join(projectRoot, file);

    if (!existsSync(filePath)) {
      console.log(`[Coding Agent] File not found: ${file}`);
      continue;
    }

    const originalContent = readFileSync(filePath, 'utf-8');
    console.log(`[Coding Agent] Read file: ${file} (${originalContent.length} chars)`);

    // In the real agentic system, this is where the Claude Code subagent
    // would analyze the file and apply the fix. For this implementation,
    // we record the file info for the fix report.
    filesModified.push({
      filePath: file,
      originalContent,
      modifiedContent: originalContent, // Subagent will modify this
      changes: `Analyzed for ${analysis.category} fix: ${analysis.rootCause}`,
    });
  }

  // Validate TypeScript if configured
  if (config.validateTypescript && filesModified.length > 0) {
    typescriptValid = validateTypeScript(projectRoot);
    console.log(`[Coding Agent] TypeScript validation: ${typescriptValid ? 'PASSED' : 'FAILED'}`);
  }

  const fix: Fix = {
    analysis,
    filesModified,
    typescriptValid,
    timestamp: new Date().toISOString(),
  };

  // Generate report
  const reportPath = generateFixReport(fix, reportsDir);
  console.log(`[Coding Agent] Report saved: ${reportPath}`);

  return {
    success: typescriptValid,
    fix,
    reportPath,
  };
}

/**
 * Validate TypeScript in the project
 */
function validateTypeScript(projectRoot: string): boolean {
  try {
    execSync('npx tsc --noEmit', {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a prompt for the Claude Code subagent to apply a fix.
 * This is used by the orchestrator when spawning the coding agent.
 */
export function generateCodingAgentPrompt(analysis: Analysis, projectRoot: string): string {
  const fileContents: string[] = [];

  for (const file of analysis.affectedFiles) {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      fileContents.push(`### ${file}\n\`\`\`typescript\n${content}\n\`\`\``);
    }
  }

  return `
You are a Coding Agent fixing a test failure.

## Test Failure Details

**Scenario:** ${analysis.scenario}
**Failed Step:** ${analysis.failedStep} (id: ${analysis.failedStepId})
**Category:** ${analysis.category}
**Root Cause:** ${analysis.rootCause}
**Confidence:** ${analysis.confidence}

## Suggested Fix

${analysis.suggestedFix}

## Affected Files

${fileContents.join('\n\n')}

## Instructions

1. Analyze the root cause and affected files
2. Apply a minimal, targeted fix that addresses the issue
3. Do NOT change unrelated code
4. Do NOT add unnecessary comments or refactoring
5. Ensure the fix maintains TypeScript type safety
6. After making changes, run \`npx tsc --noEmit\` to validate

Focus on fixing this specific issue: **${analysis.rootCause}**
`;
}

/**
 * Standalone execution for testing
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx tsx e2e/agents/codingAgent.ts <analysis-file>');
    process.exit(1);
  }

  const analysisFile = args[0];
  const analysis: Analysis = JSON.parse(readFileSync(analysisFile, 'utf-8'));

  const result = await runCodingAgent({
    analysis,
    projectRoot: process.cwd(),
    reportsDir: 'e2e/reports',
    config: {
      autoApply: true,
      maxFilesPerFix: 3,
      validateTypescript: true,
    },
  });

  console.log('\n[Coding Agent] Fix complete');
  console.log(`Success: ${result.success}`);

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

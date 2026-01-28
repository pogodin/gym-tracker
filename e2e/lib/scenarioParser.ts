import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { parse as parseYaml } from 'yaml';
import type {
  Scenario,
  ScenarioStep,
  ActionType,
  Expectation,
  ExpectationType,
  RawScenario,
  RawStep,
} from './types.js';

const VALID_ACTIONS: ActionType[] = ['click', 'fill', 'select', 'hover', 'wait', 'screenshot', 'navigate'];

const EXPECTATION_TYPES: ExpectationType[] = [
  'url',
  'url_contains',
  'visible',
  'not_visible',
  'input_value',
  'text_content',
  'element_count',
];

export function parseScenarioFile(filePath: string): Scenario {
  const content = readFileSync(filePath, 'utf-8');
  const raw = parseYaml(content) as RawScenario;

  return {
    name: raw.name,
    description: raw.description.trim(),
    preconditions: raw.preconditions ?? [],
    steps: raw.steps.map(parseStep),
    postconditions: raw.postconditions ?? [],
    tags: raw.tags ?? [],
  };
}

function parseStep(raw: RawStep): ScenarioStep {
  const action = raw.action.toLowerCase() as ActionType;

  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Invalid action "${raw.action}" in step "${raw.id}". Valid actions: ${VALID_ACTIONS.join(', ')}`);
  }

  return {
    id: raw.id,
    action,
    target: raw.target,
    value: raw.value,
    expect: raw.expect ? raw.expect.map(parseExpectation) : undefined,
  };
}

function parseExpectation(raw: string | Record<string, string>): Expectation {
  // Handle string format: "visible: Some Text"
  if (typeof raw === 'string') {
    const colonIndex = raw.indexOf(':');
    if (colonIndex === -1) {
      // Assume it's a visibility check
      return { type: 'visible', value: raw };
    }
    const type = raw.substring(0, colonIndex).trim() as ExpectationType;
    const value = raw.substring(colonIndex + 1).trim();

    if (!EXPECTATION_TYPES.includes(type)) {
      throw new Error(`Invalid expectation type "${type}". Valid types: ${EXPECTATION_TYPES.join(', ')}`);
    }

    return { type, value };
  }

  // Handle object format: { url_contains: "/template/" }
  const [type, value] = Object.entries(raw)[0];
  const normalizedType = type as ExpectationType;

  if (!EXPECTATION_TYPES.includes(normalizedType)) {
    throw new Error(`Invalid expectation type "${type}". Valid types: ${EXPECTATION_TYPES.join(', ')}`);
  }

  return { type: normalizedType, value };
}

export function loadAllScenarios(scenariosDir: string): Map<string, Scenario> {
  const scenarios = new Map<string, Scenario>();
  const files = readdirSync(scenariosDir).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml')
  );

  for (const file of files) {
    const filePath = join(scenariosDir, file);
    const scenario = parseScenarioFile(filePath);
    scenarios.set(file, scenario);
  }

  return scenarios;
}

export function getScenarioSummary(scenario: Scenario): string {
  return `${scenario.name} (${scenario.steps.length} steps) [${scenario.tags.join(', ')}]`;
}

export function filterScenariosByTags(
  scenarios: Map<string, Scenario>,
  includeTags?: string[],
  excludeTags?: string[]
): Map<string, Scenario> {
  const filtered = new Map<string, Scenario>();

  for (const [file, scenario] of scenarios) {
    const scenarioTags = new Set(scenario.tags);

    // Check include tags (if specified, at least one must match)
    if (includeTags && includeTags.length > 0) {
      const hasIncludeTag = includeTags.some((tag) => scenarioTags.has(tag));
      if (!hasIncludeTag) continue;
    }

    // Check exclude tags (none should match)
    if (excludeTags && excludeTags.length > 0) {
      const hasExcludeTag = excludeTags.some((tag) => scenarioTags.has(tag));
      if (hasExcludeTag) continue;
    }

    filtered.set(file, scenario);
  }

  return filtered;
}

export function validateScenario(scenario: Scenario): string[] {
  const errors: string[] = [];

  if (!scenario.name) {
    errors.push('Scenario must have a name');
  }

  if (!scenario.steps || scenario.steps.length === 0) {
    errors.push('Scenario must have at least one step');
  }

  const stepIds = new Set<string>();
  for (const step of scenario.steps) {
    if (!step.id) {
      errors.push(`Step is missing an id`);
    } else if (stepIds.has(step.id)) {
      errors.push(`Duplicate step id: ${step.id}`);
    } else {
      stepIds.add(step.id);
    }

    if (!step.target && step.action !== 'wait' && step.action !== 'screenshot') {
      errors.push(`Step "${step.id}" is missing a target`);
    }

    if (step.action === 'fill' && !step.value) {
      errors.push(`Step "${step.id}" has action "fill" but no value`);
    }
  }

  return errors;
}

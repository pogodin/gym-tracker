import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { glob } from 'glob';
import { join, dirname } from 'path';
import type { TestScenario, TestStep, Platform } from './types.js';

const SCENARIOS_DIR = join(dirname(import.meta.url.replace('file://', '')), '..', 'scenarios');

export function parseScenarioFile(filePath: string): TestScenario {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content) as TestScenario;

  if (!parsed.name) {
    throw new Error(`Scenario missing 'name' field: ${filePath}`);
  }
  if (!parsed.steps || !Array.isArray(parsed.steps)) {
    throw new Error(`Scenario missing 'steps' array: ${filePath}`);
  }

  return parsed;
}

export async function loadAllScenarios(): Promise<Map<string, TestScenario>> {
  const files = await glob('**/*.yaml', {
    cwd: SCENARIOS_DIR,
    ignore: ['schema.yaml'],
  });

  const scenarios = new Map<string, TestScenario>();

  for (const file of files) {
    const filePath = join(SCENARIOS_DIR, file);
    const scenario = parseScenarioFile(filePath);
    const scenarioId = file.replace('.yaml', '');
    scenarios.set(scenarioId, scenario);
  }

  return scenarios;
}

export function filterStepsForPlatform(steps: TestStep[], platform: Platform): TestStep[] {
  const filtered: TestStep[] = [];

  for (const step of steps) {
    // Handle primitive values (e.g., "- back" in YAML becomes string "back")
    if (typeof step !== 'object' || step === null) {
      // Convert string actions to proper objects
      if (typeof step === 'string') {
        filtered.push({ [step]: true } as unknown as TestStep);
      }
      continue;
    }

    if ('platform' in step) {
      const platformSteps = step.platform[platform];
      if (platformSteps) {
        filtered.push(...filterStepsForPlatform(platformSteps, platform));
      }
    } else {
      filtered.push(step);
    }
  }

  return filtered;
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

export function resolveElementSelector(element: string): { strategy: string; selector: string } {
  // Accessibility ID: @elementId
  if (element.startsWith('@')) {
    return {
      strategy: 'accessibility id',
      selector: element.slice(1),
    };
  }

  // Test ID: #testId
  if (element.startsWith('#')) {
    return {
      strategy: 'id',
      selector: element.slice(1),
    };
  }

  // XPath: xpath://...
  if (element.startsWith('xpath:')) {
    return {
      strategy: 'xpath',
      selector: element.slice(6),
    };
  }

  // Default: find by text (platform-specific XPath)
  return {
    strategy: 'xpath',
    selector: `//*[contains(@text, "${element}") or contains(@label, "${element}") or contains(@value, "${element}") or contains(@name, "${element}")]`,
  };
}

export function getScenariosByTag(
  scenarios: Map<string, TestScenario>,
  tag: string
): Map<string, TestScenario> {
  const filtered = new Map<string, TestScenario>();

  for (const [id, scenario] of scenarios) {
    if (scenario.tags?.includes(tag)) {
      filtered.set(id, scenario);
    }
  }

  return filtered;
}

export function resolveDependencies(
  scenarios: Map<string, TestScenario>,
  scenarioId: string
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const scenario = scenarios.get(id);
    if (!scenario) {
      throw new Error(`Unknown scenario dependency: ${id}`);
    }

    for (const dep of scenario.requires || []) {
      visit(dep);
    }

    order.push(id);
  }

  visit(scenarioId);
  return order;
}

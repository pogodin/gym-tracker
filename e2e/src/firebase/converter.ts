/**
 * Converts YAML test scenarios to Firebase Robo Script JSON format
 *
 * Firebase Robo scripts use a JSON format that defines actions like
 * clicks, text input, swipes, and assertions.
 */

import type { TestScenario, TestStep } from '../types.js';
import { filterStepsForPlatform, parseDuration } from '../parser.js';

// Firebase Robo Script types
interface RoboAction {
  eventType: string;
  description?: string;
  optional?: boolean;
  elementDescriptors?: ElementDescriptor[];
  replacementText?: string;
  swipeDirection?: string;
  delayTime?: number;
  screenshotName?: string;
  visionText?: string;
  contextDescriptor?: ContextDescriptor;
}

interface ElementDescriptor {
  resourceId?: string;
  resourceIdRegex?: string;
  text?: string;
  textRegex?: string;
  contentDescription?: string;
  contentDescriptionRegex?: string;
  className?: string;
}

interface ContextDescriptor {
  condition: string;
  elementDescriptors?: ElementDescriptor[];
  visionText?: string;
  negateCondition?: boolean;
}

interface RoboScript {
  id: number;
  description: string;
  crawlStage: string;
  priority: number;
  maxNumberOfRuns: number;
  contextDescriptor: ContextDescriptor;
  actions: RoboAction[];
}

const APP_PACKAGE = 'com.gymtracker.app';

/**
 * Convert element selector to Firebase element descriptor
 */
function selectorToDescriptor(selector: string): ElementDescriptor {
  // Accessibility ID: @elementId
  if (selector.startsWith('@')) {
    return {
      contentDescription: selector.slice(1),
    };
  }

  // Resource ID: #testId
  if (selector.startsWith('#')) {
    return {
      resourceId: `${APP_PACKAGE}:id/${selector.slice(1)}`,
    };
  }

  // Text match (default)
  return {
    textRegex: `.*${escapeRegex(selector)}.*`,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a single YAML step to Firebase Robo action(s)
 */
function stepToRoboActions(step: TestStep): RoboAction[] {
  const actions: RoboAction[] = [];

  if ('tap' in step) {
    actions.push({
      eventType: 'VIEW_CLICKED',
      description: `Tap: ${step.tap}`,
      elementDescriptors: [selectorToDescriptor(step.tap)],
    });
  } else if ('type' in step) {
    // First click to focus, then enter text
    actions.push({
      eventType: 'VIEW_CLICKED',
      description: `Focus: ${step.type.field}`,
      elementDescriptors: [selectorToDescriptor(step.type.field)],
    });
    actions.push({
      eventType: 'VIEW_TEXT_CHANGED',
      description: `Type: "${step.type.text}" into ${step.type.field}`,
      replacementText: step.type.text,
      elementDescriptors: [selectorToDescriptor(step.type.field)],
    });
  } else if ('clear' in step) {
    actions.push({
      eventType: 'VIEW_TEXT_CHANGED',
      description: `Clear: ${step.clear}`,
      replacementText: '',
      elementDescriptors: [selectorToDescriptor(step.clear)],
    });
  } else if ('swipe' in step) {
    const direction = step.swipe.charAt(0).toUpperCase() + step.swipe.slice(1);
    actions.push({
      eventType: 'VIEW_SWIPED',
      description: `Swipe ${step.swipe}`,
      swipeDirection: direction,
    });
  } else if ('see' in step) {
    actions.push({
      eventType: 'ASSERTION',
      description: `Assert visible: "${step.see}"`,
      contextDescriptor: {
        condition: 'element_present',
        visionText: step.see,
      },
    });
  } else if ('notSee' in step) {
    actions.push({
      eventType: 'ASSERTION',
      description: `Assert NOT visible: "${step.notSee}"`,
      contextDescriptor: {
        condition: 'element_present',
        visionText: step.notSee,
        negateCondition: true,
      },
    });
  } else if ('seeElement' in step) {
    actions.push({
      eventType: 'ASSERTION',
      description: `Assert element exists: ${step.seeElement}`,
      contextDescriptor: {
        condition: 'element_present',
        elementDescriptors: [selectorToDescriptor(step.seeElement)],
      },
    });
  } else if ('wait' in step) {
    actions.push({
      eventType: 'WAIT',
      description: `Wait ${step.wait}`,
      delayTime: parseDuration(step.wait),
    });
  } else if ('waitFor' in step) {
    actions.push({
      eventType: 'WAIT_FOR_ELEMENT',
      description: `Wait for: ${step.waitFor}`,
      delayTime: 30000, // 30 second timeout
      elementDescriptors: [selectorToDescriptor(step.waitFor)],
    });
  } else if ('back' in step) {
    actions.push({
      eventType: 'PRESSED_BACK',
      description: 'Press back button',
    });
  } else if ('screenshot' in step) {
    actions.push({
      eventType: 'TAKE_SCREENSHOT',
      description: `Screenshot: ${step.screenshot}`,
      screenshotName: step.screenshot,
    });
  } else if ('log' in step) {
    // No direct equivalent in Robo scripts, skip
  }

  return actions;
}

/**
 * Convert a full YAML scenario to Firebase Robo Script JSON
 */
export function scenarioToRoboScript(scenario: TestScenario): RoboScript[] {
  const steps = filterStepsForPlatform(scenario.steps, 'android');
  const actions: RoboAction[] = [];

  for (const step of steps) {
    actions.push(...stepToRoboActions(step));
  }

  return [
    {
      id: 1000,
      description: scenario.name,
      crawlStage: 'crawl',
      priority: 1,
      maxNumberOfRuns: 1,
      contextDescriptor: {
        condition: 'app_under_test_shown',
      },
      actions,
    },
  ];
}

/**
 * Convert scenario to JSON string
 */
export function scenarioToRoboScriptJson(scenario: TestScenario): string {
  const script = scenarioToRoboScript(scenario);
  return JSON.stringify(script, null, 2);
}

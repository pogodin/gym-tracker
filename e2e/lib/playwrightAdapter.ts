import type { Page, Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type {
  Scenario,
  ScenarioStep,
  TestResult,
  StepResult,
  Expectation,
  TestRunnerConfig,
} from './types.js';

export class PlaywrightAdapter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: TestRunnerConfig;
  private consoleErrors: string[] = [];
  private networkErrors: string[] = [];

  constructor(config: TestRunnerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: this.config.video ? { dir: 'e2e/videos' } : undefined,
    });
    this.page = await this.context.newPage();

    // Capture console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    this.page.on('pageerror', (err) => {
      this.consoleErrors.push(`Page Error: ${err.message}`);
    });

    // Capture network errors
    this.page.on('requestfailed', (request) => {
      this.networkErrors.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runScenario(scenario: Scenario, scenarioFile: string, screenshotDir: string): Promise<TestResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const stepResults: StepResult[] = [];

    // Reset error collectors
    this.consoleErrors = [];
    this.networkErrors = [];

    // Ensure screenshot directory exists
    if (!existsSync(screenshotDir)) {
      mkdirSync(screenshotDir, { recursive: true });
    }

    // Navigate to base URL first
    await this.page!.goto(this.config.baseUrl);

    // Wait for app to load (no "Loading..." text)
    await this.page!.waitForFunction(
      () => !document.body.textContent?.includes('Loading...'),
      { timeout: this.config.timeout }
    );

    let overallStatus: 'passed' | 'failed' = 'passed';
    let shouldSkip = false;

    for (const step of scenario.steps) {
      if (shouldSkip) {
        stepResults.push({
          id: step.id,
          action: step.action,
          target: step.target,
          status: 'skipped',
          duration: 0,
        });
        continue;
      }

      const stepResult = await this.executeStep(step, scenarioFile, screenshotDir);
      stepResults.push(stepResult);

      if (stepResult.screenshot) {
        screenshots.push(stepResult.screenshot);
      }

      if (stepResult.status === 'failed') {
        overallStatus = 'failed';
        shouldSkip = true; // Skip remaining steps after failure

        // Take failure screenshot
        if (this.config.screenshotOnFailure) {
          const failScreenshot = join(screenshotDir, `${step.id}-failure.png`);
          await this.page!.screenshot({ path: failScreenshot, fullPage: true });
          screenshots.push(failScreenshot);
        }
      }
    }

    return {
      scenario: scenario.name,
      scenarioFile,
      status: overallStatus,
      duration: Date.now() - startTime,
      steps: stepResults,
      screenshots,
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      timestamp: new Date().toISOString(),
    };
  }

  private async executeStep(
    step: ScenarioStep,
    scenarioFile: string,
    screenshotDir: string
  ): Promise<StepResult> {
    const startTime = Date.now();
    let error: string | undefined;
    let actualValue: string | undefined;
    let expectedValue: string | undefined;
    let screenshot: string | undefined;

    try {
      // Execute the action
      await this.executeAction(step);

      // Small wait to allow UI to settle
      await this.page!.waitForTimeout(100);

      // Take step screenshot if configured
      if (this.config.screenshotOnStep) {
        screenshot = join(screenshotDir, `${step.id}.png`);
        await this.page!.screenshot({ path: screenshot });
      }

      // Check expectations
      if (step.expect) {
        for (const expectation of step.expect) {
          const result = await this.checkExpectation(expectation);
          if (!result.passed) {
            error = result.error;
            actualValue = result.actualValue;
            expectedValue = result.expectedValue;
            throw new Error(error);
          }
        }
      }

      return {
        id: step.id,
        action: step.action,
        target: step.target,
        status: 'passed',
        duration: Date.now() - startTime,
        screenshot,
      };
    } catch (err) {
      return {
        id: step.id,
        action: step.action,
        target: step.target,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error ?? (err instanceof Error ? err.message : String(err)),
        actualValue,
        expectedValue,
        screenshot,
      };
    }
  }

  private async executeAction(step: ScenarioStep): Promise<void> {
    const { action, target, value } = step;

    switch (action) {
      case 'click':
        await this.smartClick(target);
        break;

      case 'fill':
        await this.smartFill(target, value!);
        break;

      case 'select':
        await this.page!.selectOption(target, value!);
        break;

      case 'hover':
        await this.page!.hover(target);
        break;

      case 'wait':
        const waitTime = parseInt(target, 10);
        await this.page!.waitForTimeout(waitTime);
        break;

      case 'screenshot':
        // Screenshot is handled in executeStep
        break;

      case 'navigate':
        await this.page!.goto(target.startsWith('http') ? target : `${this.config.baseUrl}${target}`);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async smartClick(target: string): Promise<void> {
    // Try different selector strategies
    const selectors = this.expandSelector(target);

    for (const selector of selectors) {
      try {
        const element = this.page!.locator(selector);
        if (await element.count() > 0) {
          await element.first().click({ timeout: this.config.timeout });
          return;
        }
      } catch {
        // Try next selector
      }
    }

    throw new Error(`Could not find clickable element: ${target}`);
  }

  private async smartFill(target: string, value: string): Promise<void> {
    const selectors = this.expandSelector(target);

    for (const selector of selectors) {
      try {
        const element = this.page!.locator(selector);
        if (await element.count() > 0) {
          await element.first().fill(value, { timeout: this.config.timeout });
          return;
        }
      } catch {
        // Try next selector
      }
    }

    throw new Error(`Could not find fillable element: ${target}`);
  }

  private expandSelector(target: string): string[] {
    const selectors: string[] = [];

    // Handle special syntax: "input[first]" -> first input
    if (target === 'input[first]') {
      return ['input >> nth=0'];
    }

    // Handle comma-separated selectors (try each one)
    if (target.includes(', ')) {
      const parts = target.split(', ').map((s) => s.trim());
      for (const part of parts) {
        selectors.push(...this.expandSelector(part));
      }
      return selectors;
    }

    // Handle Playwright's >> nth= syntax
    if (target.includes(' >> nth=')) {
      selectors.push(target);
      return selectors;
    }

    // If it starts with a CSS selector indicator, use it directly
    const isCssSelector =
      target.startsWith('.') ||
      target.startsWith('#') ||
      target.startsWith('[') ||
      target.startsWith('button[') ||
      target.startsWith('input[') ||
      target.startsWith('a[') ||
      target.includes('>>');

    if (isCssSelector) {
      selectors.push(target);
      return selectors;
    }

    // Try text-based selectors for plain text targets
    // Exact text match
    selectors.push(`text="${target}"`);
    // Partial text match
    selectors.push(`text=${target}`);
    // Button with text
    selectors.push(`button:has-text("${target}")`);
    // Link with text
    selectors.push(`a:has-text("${target}")`);
    // Any element with text
    selectors.push(`*:has-text("${target}")`);

    // Add original as fallback
    if (!selectors.includes(target)) {
      selectors.push(target);
    }

    return selectors;
  }

  private async checkExpectation(
    expectation: Expectation
  ): Promise<{ passed: boolean; error?: string; actualValue?: string; expectedValue?: string }> {
    const { type, value } = expectation;

    switch (type) {
      case 'url':
        const currentUrl = this.page!.url();
        if (!currentUrl.endsWith(value) && currentUrl !== value) {
          return {
            passed: false,
            error: `Expected URL to be "${value}" but got "${currentUrl}"`,
            actualValue: currentUrl,
            expectedValue: value,
          };
        }
        break;

      case 'url_contains':
        const url = this.page!.url();
        if (!url.includes(value)) {
          return {
            passed: false,
            error: `Expected URL to contain "${value}" but got "${url}"`,
            actualValue: url,
            expectedValue: value,
          };
        }
        break;

      case 'visible':
        const isVisible = await this.isElementVisible(value);
        if (!isVisible) {
          return {
            passed: false,
            error: `Expected "${value}" to be visible but it was not found`,
            expectedValue: value,
          };
        }
        break;

      case 'not_visible':
        const shouldBeHidden = await this.isElementVisible(value);
        if (shouldBeHidden) {
          return {
            passed: false,
            error: `Expected "${value}" to NOT be visible but it was found`,
            expectedValue: value,
          };
        }
        break;

      case 'input_value':
        // Find input and check its value
        const inputValue = await this.page!.inputValue('input:first-of-type');
        if (inputValue !== value) {
          return {
            passed: false,
            error: `Expected input value to be "${value}" but got "${inputValue}"`,
            actualValue: inputValue,
            expectedValue: value,
          };
        }
        break;

      case 'text_content':
        const bodyText = await this.page!.textContent('body');
        if (!bodyText?.includes(value)) {
          return {
            passed: false,
            error: `Expected page to contain text "${value}"`,
            expectedValue: value,
          };
        }
        break;

      case 'element_count':
        const [selector, countStr] = value.split(':');
        const expectedCount = parseInt(countStr, 10);
        const actualCount = await this.page!.locator(selector).count();
        if (actualCount !== expectedCount) {
          return {
            passed: false,
            error: `Expected ${expectedCount} elements matching "${selector}" but found ${actualCount}`,
            actualValue: String(actualCount),
            expectedValue: String(expectedCount),
          };
        }
        break;
    }

    return { passed: true };
  }

  private async isElementVisible(target: string): Promise<boolean> {
    const selectors = this.expandSelector(target);

    for (const selector of selectors) {
      try {
        const element = this.page!.locator(selector);
        const count = await element.count();
        if (count > 0) {
          const visible = await element.first().isVisible();
          if (visible) return true;
        }
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  getPage(): Page | null {
    return this.page;
  }
}

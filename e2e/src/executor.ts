import { remote, Browser } from 'webdriverio';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type {
  TestScenario,
  TestStep,
  TestResult,
  StepResult,
  DriverConfig,
  Platform,
} from './types.js';
import {
  filterStepsForPlatform,
  parseDuration,
  resolveElementSelector,
} from './parser.js';

const SCREENSHOT_DIR = join(process.cwd(), 'screenshots');
const DEFAULT_TIMEOUT = 10000;

export class TestExecutor {
  private driver: Browser | null = null;
  private config: DriverConfig;
  private screenshots: string[] = [];

  constructor(config: DriverConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    await mkdir(SCREENSHOT_DIR, { recursive: true });

    const capabilities: Record<string, unknown> = {
      platformName: this.config.platform === 'ios' ? 'iOS' : 'Android',
      'appium:deviceName': this.config.deviceName,
      'appium:platformVersion': this.config.platformVersion,
      'appium:automationName': this.config.automationName,
      'appium:app': this.config.appPath,
      'appium:noReset': false,
      'appium:fullReset': false,
    };

    if (this.config.platform === 'ios') {
      capabilities['appium:bundleId'] = 'com.gymtracker.app';
    } else {
      capabilities['appium:appPackage'] = 'com.gymtracker.app';
      capabilities['appium:appActivity'] = '.MainActivity';
    }

    this.driver = await remote({
      hostname: this.config.appiumHost,
      port: this.config.appiumPort,
      path: '/',
      capabilities,
    });
  }

  async teardown(): Promise<void> {
    if (this.driver) {
      await this.driver.deleteSession();
      this.driver = null;
    }
  }

  async runScenario(scenario: TestScenario): Promise<TestResult> {
    if (!this.driver) {
      throw new Error('Driver not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    this.screenshots = [];

    const steps = filterStepsForPlatform(scenario.steps, this.config.platform);

    let failed = false;
    let errorMessage: string | undefined;

    for (const step of steps) {
      if (failed) {
        stepResults.push({
          step,
          status: 'skipped',
          duration: 0,
        });
        continue;
      }

      const stepStart = Date.now();
      try {
        await this.executeStep(step);
        stepResults.push({
          step,
          status: 'passed',
          duration: Date.now() - stepStart,
        });
      } catch (error) {
        failed = true;
        errorMessage = error instanceof Error ? error.message : String(error);
        stepResults.push({
          step,
          status: 'failed',
          duration: Date.now() - stepStart,
          error: errorMessage,
        });

        // Capture failure screenshot
        await this.captureScreenshot(`FAILURE-${scenario.name}`);
      }
    }

    return {
      scenario: scenario.name,
      platform: this.config.platform,
      status: failed ? 'failed' : 'passed',
      duration: Date.now() - startTime,
      steps: stepResults,
      screenshots: this.screenshots,
      error: errorMessage,
    };
  }

  private async executeStep(step: TestStep): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    if ('tap' in step) {
      await this.tap(step.tap);
    } else if ('type' in step) {
      await this.type(step.type.field, step.type.text);
    } else if ('clear' in step) {
      await this.clear(step.clear);
    } else if ('swipe' in step) {
      await this.swipe(step.swipe);
    } else if ('scroll' in step) {
      await this.scrollTo(step.scroll.to);
    } else if ('see' in step) {
      await this.assertVisible(step.see);
    } else if ('notSee' in step) {
      await this.assertNotVisible(step.notSee);
    } else if ('seeElement' in step) {
      await this.assertElementExists(step.seeElement);
    } else if ('notSeeElement' in step) {
      await this.assertElementNotExists(step.notSeeElement);
    } else if ('seeCount' in step) {
      await this.assertElementCount(step.seeCount.element, step.seeCount.count);
    } else if ('wait' in step) {
      await this.wait(parseDuration(step.wait));
    } else if ('waitFor' in step) {
      await this.waitForElement(step.waitFor);
    } else if ('waitForGone' in step) {
      await this.waitForElementGone(step.waitForGone);
    } else if ('back' in step) {
      await this.pressBack();
    } else if ('navigate' in step) {
      await this.navigate(step.navigate);
    } else if ('screenshot' in step) {
      await this.captureScreenshot(step.screenshot);
    } else if ('log' in step) {
      console.log(`[LOG] ${step.log}`);
    }
  }

  private async findElement(selector: string, timeout = DEFAULT_TIMEOUT) {
    if (!this.driver) throw new Error('Driver not initialized');
    const { strategy, selector: sel } = resolveElementSelector(selector);
    const element = await this.driver.$(
      strategy === 'accessibility id' ? `~${sel}` : sel
    );
    await element.waitForExist({ timeout });
    return element;
  }

  private async tap(selector: string): Promise<void> {
    const element = await this.findElement(selector);
    await element.click();
  }

  private async type(field: string, text: string): Promise<void> {
    const element = await this.findElement(field);
    await element.setValue(text);
  }

  private async clear(field: string): Promise<void> {
    const element = await this.findElement(field);
    await element.clearValue();
  }

  private async swipe(direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');
    const { width, height } = await this.driver.getWindowSize();

    const startX = width / 2;
    const startY = height / 2;
    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'up':
        endY = height * 0.2;
        break;
      case 'down':
        endY = height * 0.8;
        break;
      case 'left':
        endX = width * 0.2;
        break;
      case 'right':
        endX = width * 0.8;
        break;
    }

    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 300, x: endX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await this.driver.releaseActions();
  }

  private async scrollTo(selector: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    for (let i = 0; i < 10; i++) {
      try {
        const { selector: sel } = resolveElementSelector(selector);
        const element = await this.driver.$(sel);
        if (await element.isDisplayed()) {
          return;
        }
      } catch {
        // Element not found, swipe and try again
      }
      await this.swipe('up');
      await this.wait(300);
    }

    throw new Error(`Could not scroll to element: ${selector}`);
  }

  private async assertVisible(text: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    const xpath = `//*[contains(@text, "${text}") or contains(@label, "${text}") or contains(@value, "${text}")]`;
    const element = await this.driver.$(xpath);
    await element.waitForDisplayed({ timeout: DEFAULT_TIMEOUT });
  }

  private async assertNotVisible(text: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    const xpath = `//*[contains(@text, "${text}") or contains(@label, "${text}") or contains(@value, "${text}")]`;
    const element = await this.driver.$(xpath);

    const isDisplayed = await element.isDisplayed().catch(() => false);
    if (isDisplayed) {
      throw new Error(`Element with text "${text}" should not be visible`);
    }
  }

  private async assertElementExists(selector: string): Promise<void> {
    await this.findElement(selector);
  }

  private async assertElementNotExists(selector: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    const { selector: sel } = resolveElementSelector(selector);
    const element = await this.driver.$(sel);

    const exists = await element.isExisting().catch(() => false);
    if (exists) {
      throw new Error(`Element "${selector}" should not exist`);
    }
  }

  private async assertElementCount(selector: string, count: number): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    const { selector: sel } = resolveElementSelector(selector);
    const elements = await this.driver.$$(sel);

    if (elements.length !== count) {
      throw new Error(
        `Expected ${count} elements matching "${selector}", found ${elements.length}`
      );
    }
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForElement(selector: string): Promise<void> {
    await this.findElement(selector, 30000);
  }

  private async waitForElementGone(selector: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    const { selector: sel } = resolveElementSelector(selector);
    const element = await this.driver.$(sel);
    await element.waitForExist({ timeout: 30000, reverse: true });
  }

  private async pressBack(): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    if (this.config.platform === 'android') {
      await this.driver.back();
    } else {
      // iOS: look for back button or swipe from edge
      const backButton = await this.driver.$('~Back');
      if (await backButton.isExisting()) {
        await backButton.click();
      } else {
        // Swipe from left edge
        const { height } = await this.driver.getWindowSize();
        await this.driver.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: 0, y: height / 2 },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerMove', duration: 300, x: 200, y: height / 2 },
              { type: 'pointerUp', button: 0 },
            ],
          },
        ]);
        await this.driver.releaseActions();
      }
    }
  }

  private async navigate(route: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    // Deep link navigation
    const url = `gymtracker://${route}`;

    if (this.config.platform === 'ios') {
      await this.driver.execute('mobile: deepLink', { url });
    } else {
      await this.driver.execute('mobile: deepLink', {
        url,
        package: 'com.gymtracker.app',
      });
    }
  }

  private async captureScreenshot(name: string): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.config.platform}-${name}-${timestamp}.png`;
    const filepath = join(SCREENSHOT_DIR, filename);

    const screenshot = await this.driver.takeScreenshot();
    await writeFile(filepath, screenshot, 'base64');

    this.screenshots.push(filepath);
    console.log(`  📸 Screenshot: ${filename}`);
  }
}

export function formatResults(results: TestResult[]): string {
  const lines: string[] = ['\n=== Test Results ===\n'];

  let passed = 0;
  let failed = 0;
  let totalDuration = 0;

  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : '❌';
    lines.push(`${icon} ${result.scenario} (${result.platform})`);
    lines.push(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.error) {
      lines.push(`   Error: ${result.error}`);
    }

    if (result.status === 'passed') {
      passed++;
    } else {
      failed++;
    }

    totalDuration += result.duration;
    lines.push('');
  }

  lines.push('---');
  lines.push(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  lines.push(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  return lines.join('\n');
}

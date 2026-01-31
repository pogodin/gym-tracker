// Test Scenario Types

export type Platform = 'ios' | 'android';

export interface TestScenario {
  name: string;
  description?: string;
  tags?: string[];
  requires?: string[];
  steps: TestStep[];
}

export type TestStep =
  | TapStep
  | TypeStep
  | ClearStep
  | SwipeStep
  | ScrollStep
  | SeeStep
  | NotSeeStep
  | SeeElementStep
  | NotSeeElementStep
  | SeeCountStep
  | WaitStep
  | WaitForStep
  | WaitForGoneStep
  | BackStep
  | NavigateStep
  | ScreenshotStep
  | LogStep
  | PlatformStep;

export interface TapStep {
  tap: string;
}

export interface TypeStep {
  type: {
    field: string;
    text: string;
  };
}

export interface ClearStep {
  clear: string;
}

export interface SwipeStep {
  swipe: 'up' | 'down' | 'left' | 'right';
}

export interface ScrollStep {
  scroll: {
    to: string;
  };
}

export interface SeeStep {
  see: string;
}

export interface NotSeeStep {
  notSee: string;
}

export interface SeeElementStep {
  seeElement: string;
}

export interface NotSeeElementStep {
  notSeeElement: string;
}

export interface SeeCountStep {
  seeCount: {
    element: string;
    count: number;
  };
}

export interface WaitStep {
  wait: string;
}

export interface WaitForStep {
  waitFor: string;
}

export interface WaitForGoneStep {
  waitForGone: string;
}

export interface BackStep {
  back: null | undefined | boolean;
}

export interface NavigateStep {
  navigate: string;
}

export interface ScreenshotStep {
  screenshot: string;
}

export interface LogStep {
  log: string;
}

export interface PlatformStep {
  platform: {
    ios?: TestStep[];
    android?: TestStep[];
  };
}

// Test Result Types

export interface TestResult {
  scenario: string;
  platform: Platform;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  steps: StepResult[];
  screenshots: string[];
  error?: string;
}

export interface StepResult {
  step: TestStep;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

// Driver Configuration

export interface DriverConfig {
  platform: Platform;
  appPath: string;
  deviceName: string;
  platformVersion: string;
  automationName: string;
  appiumHost: string;
  appiumPort: number;
}

export const DEFAULT_IOS_CONFIG: DriverConfig = {
  platform: 'ios',
  appPath: '../ios/App/build/Debug-iphonesimulator/App.app',
  deviceName: 'iPhone 15',
  platformVersion: '17.0',
  automationName: 'XCUITest',
  appiumHost: 'localhost',
  appiumPort: 4723,
};

export const DEFAULT_ANDROID_CONFIG: DriverConfig = {
  platform: 'android',
  appPath: '../android/app/build/outputs/apk/debug/app-debug.apk',
  deviceName: 'Pixel 7',
  platformVersion: '14',
  automationName: 'UiAutomator2',
  appiumHost: 'localhost',
  appiumPort: 4723,
};

# Claude Agents for Automated E2E Testing

Two specialized Claude agents handle integration testing autonomously on each platform.

## Architecture

```
                    ┌─────────────────────┐
                    │   Test Scenarios    │
                    │      (YAML)         │
                    └─────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│    iOS Testing Agent     │   │  Android Testing Agent   │
│                          │   │                          │
│  • Builds iOS app        │   │  • Builds Android app    │
│  • Starts iOS Simulator  │   │  • Starts Android Emu    │
│  • Runs Appium + tests   │   │  • Runs Appium + tests   │
│  • Reports results       │   │  • Reports results       │
│  • Debugs failures       │   │  • Debugs failures       │
└──────────────────────────┘   └──────────────────────────┘
```

## Agent Responsibilities

### iOS Testing Agent

1. **Environment Setup**
   - Verify Xcode and iOS Simulator availability
   - Build the iOS app (`npm run build && npx cap sync ios`)
   - Start Appium server with XCUITest driver

2. **Test Execution**
   - Load and parse YAML test scenarios
   - Execute scenarios on iOS Simulator
   - Capture screenshots on failure

3. **Result Analysis**
   - Analyze test failures
   - Provide debugging suggestions
   - Report pass/fail summary

### Android Testing Agent

1. **Environment Setup**
   - Verify Android SDK and emulator availability
   - Build the Android app (`npm run build && npx cap sync android`)
   - Start Appium server with UiAutomator2 driver

2. **Test Execution**
   - Load and parse YAML test scenarios
   - Execute scenarios on Android Emulator
   - Capture screenshots on failure

3. **Result Analysis**
   - Analyze test failures
   - Provide debugging suggestions
   - Report pass/fail summary

## Usage

### Manual Invocation

```bash
# Run iOS testing agent
npm run agent:ios

# Run Android testing agent
npm run agent:android
```

### From Claude Code CLI

You can spawn these agents directly from Claude Code:

```
# In Claude Code CLI
> Run iOS integration tests for gym-tracker
> Run Android integration tests for gym-tracker
```

## Agent Prompts

The agents are configured with detailed system prompts that guide their behavior.
See the individual prompt files:

- `ios-agent-prompt.md` - iOS agent system prompt
- `android-agent-prompt.md` - Android agent system prompt

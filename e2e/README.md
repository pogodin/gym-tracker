# Gym Tracker E2E Integration Testing Framework

Cross-platform integration testing for iOS and Android using a unified YAML scenario format.

## Architecture

```
e2e/
├── scenarios/           # Human-readable test scenarios (YAML)
│   ├── schema.yaml      # DSL documentation
│   ├── smoke-test.yaml  # Full end-to-end test
│   ├── templates/       # Template CRUD tests
│   ├── workout/         # Workout session tests
│   ├── history/         # History viewing tests
│   └── settings/        # Settings tests
├── src/
│   ├── types.ts         # TypeScript type definitions
│   ├── parser.ts        # YAML scenario parser
│   ├── executor.ts      # Test execution engine (Appium/WebDriverIO)
│   ├── cli.ts           # CLI tool for running tests
│   ├── runners/         # Platform-specific test runners
│   │   ├── ios.ts
│   │   └── android.ts
│   └── agents/          # Claude agent entry points
│       ├── ios-agent.ts
│       └── android-agent.ts
├── agents/              # Claude agent configuration
│   ├── ios-agent-prompt.md
│   └── android-agent-prompt.md
└── screenshots/         # Test failure screenshots (generated)
```

## Prerequisites

### Common Requirements
- Node.js 18+
- Appium 2.x: `npm install -g appium`
- Appium drivers:
  ```bash
  appium driver install xcuitest   # iOS
  appium driver install uiautomator2  # Android
  ```

### iOS Requirements
- macOS
- Xcode 15+ with Command Line Tools
- iOS Simulator

### Android Requirements
- Android Studio
- Android SDK (API 34+)
- Android Emulator with a configured AVD

### Firebase Test Lab (Cloud Testing - No Local Setup!)
- Google Cloud SDK (`brew install google-cloud-sdk`)
- Firebase project with Test Lab enabled
- Free tier: 60 min/day virtual + 30 min/day physical devices

---

## Installation

```bash
cd gym-tracker/e2e
npm install
```

---

## Firebase Test Lab (Recommended for Android)

Run tests on Google's cloud devices without local Android setup.

### Quick Start

```bash
# 1. Setup Firebase (one-time)
npm run firebase:setup

# 2. Build the app
cd .. && npm run build && npx cap sync android
cd android && ./gradlew assembleDebug && cd ../e2e

# 3. Run tests on Firebase
npm run test:firebase
```

See [FIREBASE.md](./FIREBASE.md) for detailed documentation.

---

## Local Testing (with Appium)

### Step 1: Build the App

```bash
cd gym-tracker

# Build web assets
npm run build

# Sync to native projects
npx cap sync
```

### Step 2: Build Native Apps

**iOS:**
```bash
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -derivedDataPath build
```

**Android:**
```bash
cd android
./gradlew assembleDebug
```

### Step 3: Start Simulator/Emulator

**iOS:**
```bash
# Boot simulator
xcrun simctl boot "iPhone 15"

# Open Simulator app
open -a Simulator
```

**Android:**
```bash
# List available AVDs
emulator -list-avds

# Start emulator (replace with your AVD name)
emulator -avd Pixel_7_API_34 &

# Wait for device
adb wait-for-device
```

### Step 4: Start Appium Server

```bash
cd gym-tracker/e2e
npx appium
```

Keep this running in a separate terminal.

### Step 5: Run Tests

**iOS:**
```bash
npm run test:ios
```

**Android:**
```bash
npm run test:android
```

**Specific scenario:**
```bash
npm run test:scenario -- -p ios -s smoke-test
npm run test:scenario -- -p android -s templates/create-template
```

**By tag:**
```bash
npm run test:scenario -- -p ios -t smoke
```

**List available scenarios:**
```bash
npm run test:scenario -- --list
```

---

## Test Scenarios

### Writing Scenarios

Scenarios are YAML files with human-readable steps:

```yaml
name: Create Workout Template
description: User creates a new template
tags: [smoke, templates]

steps:
  - see: "Gym Tracker"
  - tap: "New Template"
  - type:
      field: "@template-name-input"
      text: "Push Day"
  - tap: "Add Exercise"
  - type:
      field: "@exercise-input-0"
      text: "Bench Press"
  - tap: "Create Template"
  - see: "Push Day"
```

### Available Actions

| Action | Description |
|--------|-------------|
| `tap: "element"` | Tap button/element |
| `type: {field, text}` | Enter text into field |
| `clear: "field"` | Clear input field |
| `swipe: up/down/left/right` | Swipe gesture |
| `scroll: {to: "element"}` | Scroll until element visible |
| `see: "text"` | Assert text is visible |
| `notSee: "text"` | Assert text is NOT visible |
| `wait: "2s"` | Wait for duration |
| `waitFor: "element"` | Wait for element to appear |
| `back:` | Press system back |
| `screenshot: "name"` | Capture screenshot |

### Element Selectors

| Format | Description |
|--------|-------------|
| `"Button Text"` | Find by visible text |
| `"@accessibilityId"` | Find by accessibility ID (recommended) |
| `"#testId"` | Find by test ID |
| `"xpath://..."` | XPath query (escape hatch) |

### Platform-Specific Steps

```yaml
steps:
  - tap: "Export"
  - platform:
      ios:
        - see: "Share"
      android:
        - see: "Download"
```

---

## Claude Agent Automation

Two Claude agents can run tests autonomously.

### Spawning from Claude Code CLI

**iOS Testing Agent:**
```
You are the iOS integration testing agent. Your task:

1. Read the agent prompt: gym-tracker/e2e/agents/ios-agent-prompt.md
2. Verify the environment by running: npm run agent:ios
3. If environment checks pass:
   - Start Appium: npx appium (in background)
   - Boot simulator: xcrun simctl boot "iPhone 15"
   - Run tests: npm run test:ios
4. Analyze results and report failures
5. For any failures, examine screenshots in e2e/screenshots/
```

**Android Testing Agent:**
```
You are the Android integration testing agent. Your task:

1. Read the agent prompt: gym-tracker/e2e/agents/android-agent-prompt.md
2. Verify the environment by running: npm run agent:android
3. If environment checks pass:
   - Start emulator: emulator -avd <AVD_NAME> &
   - Wait for boot: adb wait-for-device
   - Start Appium: npx appium (in background)
   - Run tests: npm run test:android
4. Analyze results and report failures
5. For any failures, examine screenshots in e2e/screenshots/
```

### Running Agents in Parallel

From Claude Code, spawn both agents simultaneously:

```
Run iOS and Android integration tests in parallel for gym-tracker.
Use two separate agents - one for each platform.
```

---

## Adding Accessibility IDs to the App

For reliable test selectors, add `accessibilityLabel` props to React components:

```tsx
// Example: Button with accessibility ID
<Button
  accessibilityLabel="start-workout-Push Day"
  onPress={handleStart}
>
  Start Workout
</Button>

// Example: Input with accessibility ID
<Input
  accessibilityLabel="template-name-input"
  value={name}
  onChange={setName}
/>
```

This maps to:
- `@start-workout-Push Day` in test scenarios
- `@template-name-input` in test scenarios

---

## Troubleshooting

### Appium Connection Failed

```
Error: Could not create session
```

- Ensure Appium is running: `npx appium`
- Check port 4723 is available
- Verify simulator/emulator is booted

### Element Not Found

```
Error: Element not found
```

- Check selector matches actual element
- Add accessibility IDs to components
- Increase wait time with `waitFor`
- Take a screenshot to see actual screen state

### iOS Build Fails

```bash
# Clean and rebuild
cd ios/App
xcodebuild clean
cd ../..
npx cap sync ios
# Then rebuild
```

### Android Emulator Not Starting

```bash
# Cold boot the emulator
emulator -avd Pixel_7_API_34 -no-snapshot-load

# Check for hardware acceleration issues
emulator -avd Pixel_7_API_34 -gpu swiftshader_indirect
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/e2e-ios.yml
name: iOS E2E Tests

on: [push]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd gym-tracker && npm ci
          cd e2e && npm ci

      - name: Build app
        run: |
          cd gym-tracker
          npm run build
          npx cap sync ios

      - name: Build iOS app
        run: |
          cd gym-tracker/ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App -configuration Debug \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -derivedDataPath build

      - name: Start Appium
        run: |
          cd gym-tracker/e2e
          npx appium &
          sleep 5

      - name: Run tests
        run: |
          cd gym-tracker/e2e
          npm run test:ios

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: ios-screenshots
          path: gym-tracker/e2e/screenshots/
```

---

## License

Part of the Gym Tracker application.

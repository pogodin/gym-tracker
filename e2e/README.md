# Gym Tracker E2E Integration Testing

Cross-platform integration testing for iOS and Android using **Maestro**.

## Why Maestro?

- **Cross-platform**: Same YAML tests run on iOS and Android
- **Human-readable**: Simple, declarative syntax
- **Built-in tolerance**: Handles flaky tests automatically
- **Cloud testing**: Run on real devices via Maestro Cloud
- **Free local testing**: Unlimited tests on your own devices

---

## Project Structure

```
e2e/
├── maestro/                    # Maestro test flows
│   ├── config.yaml             # Shared configuration
│   ├── smoke-test.yaml         # Full end-to-end test
│   ├── templates/              # Template CRUD tests
│   │   ├── create-template.yaml
│   │   ├── edit-template.yaml
│   │   └── delete-template.yaml
│   ├── workout/                # Workout session tests
│   │   ├── start-workout.yaml
│   │   ├── log-sets.yaml
│   │   └── finish-workout.yaml
│   ├── history/                # History viewing tests
│   │   └── view-history.yaml
│   └── settings/               # Settings tests
│       └── settings-navigation.yaml
└── README.md
```

---

## Prerequisites

### Install Maestro CLI

**All platforms (macOS, Linux, Windows WSL):**
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

After installation, restart your terminal or run:
```bash
export PATH="$PATH:$HOME/.maestro/bin"
```

### Verify Installation
```bash
maestro --version
```

### Platform Requirements

**iOS:**
- macOS only
- Xcode 14+ with Command Line Tools
- iOS Simulator

**Android:**
- Android Studio
- Android SDK
- Android Emulator or connected device

---

## Running Tests Locally

### 1. Build the App

**iOS:**
```bash
cd gym-tracker
npm run build
npx cap sync ios
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -derivedDataPath build
```

**Android:**
```bash
cd gym-tracker
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

### 2. Start Simulator/Emulator

**iOS:**
```bash
# Boot simulator
xcrun simctl boot "iPhone 15"

# Or let Maestro handle it automatically
```

**Android:**
```bash
# Start emulator
emulator -avd <YOUR_AVD_NAME> &
adb wait-for-device
```

### 3. Run Tests

**Run all tests:**
```bash
cd gym-tracker/e2e
maestro test maestro/
```

**Run single test:**
```bash
maestro test maestro/smoke-test.yaml
```

**Run with output in project directory (recommended):**
```bash
maestro test --debug-output test-results --flatten-debug-output maestro/smoke-test.yaml
```

**Run on specific device:**
```bash
# List available devices
xcrun simctl list devices booted  # iOS
adb devices                        # Android

# Run on specific device by UUID/ID
maestro test --device "DEVICE_UUID" maestro/smoke-test.yaml
```

**Run tests by tag:**
```bash
maestro test --include-tags=smoke maestro/
```

**Run with continuous mode (re-run on file changes):**
```bash
maestro test --continuous maestro/smoke-test.yaml
```

### WebView Limitations

This is a Capacitor app using WebView. Some limitations apply:

1. **Text selectors**: Not all text in the WebView is accessible via text selectors. Use regex patterns like `".*Start.*"` when exact text matching fails.

2. **Element IDs**: `aria-label` attributes may not work as ID selectors. Prefer text-based selectors.

3. **Coordinate taps**: As a fallback, use point coordinates: `tapOn: { point: "50%,20%" }`

---

## Maestro Cloud

Run tests on real devices in the cloud without local setup.

### Setup

1. **Create account** at https://console.mobile.dev

2. **Get API key** from Console → Settings → API Keys

3. **Authenticate CLI:**
```bash
maestro cloud login
```

### Run Tests on Cloud

**Android:**
```bash
maestro cloud \
  --app-file=android/app/build/outputs/apk/debug/app-debug.apk \
  e2e/maestro/
```

**iOS:**
```bash
maestro cloud \
  --app-file=ios/App/build/Build/Products/Debug-iphonesimulator/App.app \
  e2e/maestro/
```

### Pricing

- **Free tier**: Limited monthly test minutes
- **Paid plans**: Starting at $250/month per device for unlimited tests

See https://maestro.dev/pricing for current pricing.

---

## Writing Tests

### Basic Syntax

```yaml
appId: com.gymtracker.app
---
- launchApp
- tapOn: "Button Text"
- inputText: "User input"
- assertVisible: "Expected text"
```

### Available Commands

| Command | Description |
|---------|-------------|
| `launchApp` | Launch the app |
| `tapOn` | Tap element by text or id |
| `doubleTapOn` | Double tap element |
| `inputText` | Enter text into focused field |
| `eraseText` | Delete characters from field |
| `assertVisible` | Verify element is visible |
| `assertNotVisible` | Verify element is NOT visible |
| `scroll` | Scroll vertically |
| `swipe` | Swipe gesture |
| `back` | Press system back |
| `takeScreenshot` | Capture screenshot |
| `waitForAnimationToEnd` | Wait for animations |
| `extendedWaitUntil` | Wait with timeout |

### Element Selection

**By visible text:**
```yaml
- tapOn: "Submit"
```

**By accessibility ID:**
```yaml
- tapOn:
    id: "submit-button"
```

**By index (when multiple matches):**
```yaml
- tapOn:
    text: "Item"
    index: 0
```

**Optional (don't fail if not found):**
```yaml
- tapOn:
    text: "Optional Button"
    optional: true
```

### Waiting

**Wait for element:**
```yaml
- extendedWaitUntil:
    visible: "Loading complete"
    timeout: 10000
```

**Wait for animation:**
```yaml
- waitForAnimationToEnd
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Build Android app
        run: |
          cd gym-tracker
          npm ci && npm run build
          npx cap sync android
          cd android && ./gradlew assembleDebug

      - name: Run Maestro Cloud tests
        env:
          MAESTRO_CLOUD_API_KEY: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          export PATH="$PATH:$HOME/.maestro/bin"
          maestro cloud \
            --apiKey=$MAESTRO_CLOUD_API_KEY \
            --app-file=gym-tracker/android/app/build/outputs/apk/debug/app-debug.apk \
            gym-tracker/e2e/maestro/

  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build iOS app
        run: |
          cd gym-tracker
          npm ci && npm run build
          npx cap sync ios
          cd ios/App
          xcodebuild -workspace App.xcworkspace -scheme App \
            -configuration Debug \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -derivedDataPath build

      - name: Install Maestro
        run: brew install maestro

      - name: Run Maestro tests
        run: |
          xcrun simctl boot "iPhone 15" || true
          cd gym-tracker/e2e
          maestro test maestro/
```

---

## Troubleshooting

### "Element not found"

1. Ensure accessibility labels are set in React components
2. Increase timeout with `extendedWaitUntil`
3. Use `maestro studio` to inspect the app hierarchy
4. Take a screenshot to see current state

### "App not installed"

1. Build the app first
2. Check the `appId` matches your app's bundle/package ID
3. Verify simulator/emulator is running

### Debug with Maestro Studio

```bash
maestro studio
```

This opens an interactive UI to:
- See element hierarchy
- Test selectors in real-time
- Record interactions

---

## Resources

- [Maestro Documentation](https://docs.maestro.dev)
- [Maestro GitHub](https://github.com/mobile-dev-inc/Maestro)
- [Maestro Cloud Console](https://console.mobile.dev)

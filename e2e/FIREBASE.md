# Firebase Test Lab Integration

Run Android integration tests on Google's device cloud using the free tier.

## Free Tier Limits

| Device Type | Daily Limit | Best For |
|-------------|-------------|----------|
| Virtual devices | 60 min/day | Regular CI testing |
| Physical devices | 30 min/day | Final verification |

This is usually enough for:
- ~20-30 smoke tests per day on virtual devices
- ~10-15 tests on physical devices

---

## Quick Start

### 1. Install Google Cloud SDK

**macOS:**
```bash
brew install google-cloud-sdk
```

**Or download from:** https://cloud.google.com/sdk/docs/install

### 2. Run Setup Wizard

```bash
cd gym-tracker/e2e
npm run firebase:setup
```

This will:
- Check gcloud installation
- Authenticate with Google
- Set up your Firebase project
- Enable required APIs

### 3. Build the Android App

```bash
cd gym-tracker
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

### 4. Run Tests

**On virtual devices (recommended, uses less quota):**
```bash
npm run test:firebase
```

**On physical devices:**
```bash
npm run test:firebase -- --physical
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    YAML Test Scenarios                       │
│                   (e2e/scenarios/*.yaml)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Scenario Converter                        │
│              (YAML → Firebase Robo Script JSON)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    gcloud CLI Upload                         │
│                  (APK + Robo Scripts)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Test Lab Cloud                     │
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │   Pixel 2    │  │   Pixel 6    │  │   Galaxy     │      │
│   │  (Virtual)   │  │  (Physical)  │  │  (Physical)  │      │
│   └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Test Results                            │
│        (Screenshots, Videos, Logs, Pass/Fail)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Scenario Conversion

Our YAML scenarios are automatically converted to Firebase Robo Script format:

**Input (YAML):**
```yaml
steps:
  - tap: "New Template"
  - type:
      field: "@template-name-input"
      text: "Push Day"
  - see: "Push Day"
```

**Output (Firebase Robo Script JSON):**
```json
[{
  "id": 1000,
  "actions": [
    {
      "eventType": "VIEW_CLICKED",
      "elementDescriptors": [{ "textRegex": ".*New Template.*" }]
    },
    {
      "eventType": "VIEW_TEXT_CHANGED",
      "replacementText": "Push Day",
      "elementDescriptors": [{ "contentDescription": "template-name-input" }]
    },
    {
      "eventType": "ASSERTION",
      "contextDescriptor": {
        "condition": "element_present",
        "visionText": "Push Day"
      }
    }
  ]
}]
```

---

## Configuration

Edit `src/firebase/run-tests.ts` to customize:

```typescript
const DEFAULT_CONFIG = {
  virtualDevices: [
    { model: 'Pixel2', version: '30' },
    // Add more virtual devices
  ],
  physicalDevices: [
    { model: 'oriole', version: '33' }, // Pixel 6
    // Add more physical devices
  ],
  timeout: '5m',
};
```

### Available Devices

List all available devices:
```bash
gcloud firebase test android models list
```

Popular virtual devices:
- `Pixel2` (API 28-30)
- `Pixel3` (API 28-30)
- `MediumPhone.arm` (API 30-34)

Popular physical devices:
- `oriole` - Pixel 6
- `bluejay` - Pixel 6a
- `panther` - Pixel 7

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Android E2E Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup gcloud CLI
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Install dependencies
        run: |
          cd gym-tracker && npm ci
          cd e2e && npm ci

      - name: Build Android app
        run: |
          cd gym-tracker
          npm run build
          npx cap sync android
          cd android && ./gradlew assembleDebug

      - name: Run Firebase Test Lab
        run: |
          cd gym-tracker/e2e
          npm run test:firebase
```

### Required Secrets

1. **GCP_PROJECT_ID** - Your Firebase project ID
2. **GCP_SA_KEY** - Service account JSON key with roles:
   - `roles/cloudtestservice.testAdmin`
   - `roles/firebase.admin`

Create a service account:
```bash
# Create service account
gcloud iam service-accounts create e2e-testing \
  --display-name="E2E Testing"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member="serviceAccount:e2e-testing@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudtestservice.testAdmin"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=e2e-testing@YOUR_PROJECT.iam.gserviceaccount.com
```

---

## Viewing Results

After tests run, you'll see:
1. **Console output** - Pass/fail status for each test
2. **Firebase Console** - Full results with:
   - Screenshots at each step
   - Video recording of the test
   - Device logs (logcat)
   - Performance metrics

Access results at:
```
https://console.firebase.google.com/project/YOUR_PROJECT/testlab/histories
```

---

## Troubleshooting

### "Quota exceeded"

You've hit the daily free tier limit. Options:
1. Wait until tomorrow (quotas reset at midnight Pacific)
2. Switch to virtual devices (more quota)
3. Upgrade to Blaze plan (pay-as-you-go)

### "App crashed on launch"

1. Test the APK locally first
2. Check Firebase Console logs for crash details
3. Ensure all native dependencies are bundled

### "Element not found"

1. Add accessibility labels to React components
2. Use more specific selectors
3. Add `wait` steps before interactions

### "Authentication required"

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

---

## Cost Estimation (Beyond Free Tier)

If you exceed the free tier:

| Device Type | Cost | Example |
|-------------|------|---------|
| Virtual | $1/hour | 60 min = $1 |
| Physical | $5/hour | 30 min = $2.50 |

Most apps stay within the free tier for regular CI testing.

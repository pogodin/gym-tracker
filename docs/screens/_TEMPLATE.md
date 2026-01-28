# Screen: [Screen Name]

## Overview

Brief description of the screen's purpose and when users see it.

## Route

`/path/to/screen/:param`

## Source File

`src/pages/ScreenName.tsx`

---

## Layout

Describe the visual structure from top to bottom:

```
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│                                     │
│ Main Content Area                   │
│                                     │
├─────────────────────────────────────┤
│ Bottom Action Bar (if applicable)   │
└─────────────────────────────────────┘
```

---

## Components

| Component | Location | Description |
|-----------|----------|-------------|
| ComponentName | Header | What it displays/does |

---

## User Actions

### [Action Name]

| Property | Value |
|----------|-------|
| **Trigger** | How the user initiates (tap, swipe, input, etc.) |
| **Element** | Which component/button |
| **Result** | What happens immediately |
| **Navigation** | Where user goes (if applicable) |
| **Confirmation** | Whether a dialog is shown first |

---

## Inputs

| Input | Type | Validation | Behavior |
|-------|------|------------|----------|
| field_name | text/number/select | Required, min/max, etc. | What happens on change/blur |

---

## State

### Data Loaded
- What data is fetched when screen mounts
- Where it comes from (API, local storage, etc.)

### Local State
- What state is managed locally
- Optimistic updates behavior

---

## Navigation

### Entry Points
- How users arrive at this screen

### Exit Points
| Destination | Trigger | Condition |
|-------------|---------|-----------|
| /route | Button click | Always/conditional |

---

## Edge Cases

- Empty state (no data)
- Loading state
- Error state
- Offline behavior

---

## Related Screens

- [Screen Name](/docs/screens/screen-name.md) - relationship description

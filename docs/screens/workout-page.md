# Screen: Workout Session

## Overview

The main active workout tracking interface where users log sets, weight, and reps for each exercise. Users can add/remove exercises, reorder them via drag-and-drop, mark sets as completed, and finish the workout when done.

## Route

`/workout/:templateId`

## Source File

`src/pages/WorkoutPage.tsx`

---

## Layout

```
┌─────────────────────────────────────┐
│ [X]  Template Name    3/8 sets done │  ← Sticky header
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ≡ Bench Press         2/3  [🗑] │ │  ← ExerciseCard (draggable)
│ │   1.  [185] lbs  [8] reps  [✓] │ │  ← SetRow
│ │   2.  [185] lbs  [6] reps  [✓] │ │
│ │   3.  [185] lbs  [_] reps  [ ] │ │
│ │   [+ Add Set]                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ≡ Squats              1/3  [🗑] │ │
│ │   ...                          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Add Exercise]                    │
│                                     │
├─────────────────────────────────────┤
│        [Finish Workout]             │  ← Fixed bottom bar
└─────────────────────────────────────┘
```

---

## Components

| Component | Location | Description |
|-----------|----------|-------------|
| Close Button (X) | Header left | Exits workout with confirmation |
| Template Name | Header center | Shows name of workout template |
| Progress Counter | Header right | Shows "X/Y sets done" |
| ExerciseList | Main content | Container with drag-and-drop support |
| ExerciseCard | Main content | Single exercise with its sets |
| Drag Handle | ExerciseCard left | Touch target for reordering |
| Delete Exercise Button | ExerciseCard right | Removes exercise with confirmation |
| SetRow | Inside ExerciseCard | Single set with inputs |
| Weight Input | SetRow | Number input for weight in lbs |
| Reps Input | SetRow | Number input for repetitions |
| Completion Checkbox | SetRow right | Marks set as done |
| Add Set Button | ExerciseCard bottom | Creates new set for that exercise |
| Add Exercise Button | Below exercise list | Opens modal to add exercise |
| Finish Workout Button | Fixed bottom bar | Completes the session |

---

## User Actions

### Close/Cancel Workout

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | X button in header |
| **Result** | Shows confirmation dialog |
| **Navigation** | If confirmed: navigate to `/` (Home) |
| **Confirmation** | Yes - "Are you sure you want to leave? Your progress will be saved." |

### Update Weight

| Property | Value |
|----------|-------|
| **Trigger** | Input change + blur |
| **Element** | Weight input field |
| **Result** | Value saved to database |
| **Navigation** | None |
| **Confirmation** | No |

### Update Reps

| Property | Value |
|----------|-------|
| **Trigger** | Input change + blur |
| **Element** | Reps input field |
| **Result** | Value saved to database |
| **Navigation** | None |
| **Confirmation** | No |

### Toggle Set Completion

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | Checkbox on SetRow |
| **Result** | Set marked complete/incomplete, progress counter updates |
| **Navigation** | None |
| **Confirmation** | No |

### Delete Set

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | Delete button on SetRow |
| **Result** | Set removed, remaining sets renumbered |
| **Navigation** | None |
| **Confirmation** | No |

### Add Set

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | "+ Add Set" button |
| **Result** | New set row appears with auto-numbered set, weight copied from previous set |
| **Navigation** | None |
| **Confirmation** | No |

### Delete Exercise

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | Trash icon on ExerciseCard |
| **Result** | Exercise and all its sets removed |
| **Navigation** | None |
| **Confirmation** | Yes - "Delete this exercise?" |

### Add Exercise

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | "+ Add Exercise" button |
| **Result** | AddExerciseModal opens |
| **Navigation** | None (modal) |
| **Confirmation** | No |

### Reorder Exercise

| Property | Value |
|----------|-------|
| **Trigger** | Drag and drop |
| **Element** | Drag handle (≡) on ExerciseCard |
| **Result** | Exercise moves to new position, order saved |
| **Navigation** | None |
| **Confirmation** | No |

### Finish Workout

| Property | Value |
|----------|-------|
| **Trigger** | Tap |
| **Element** | "Finish Workout" button |
| **Result** | Session marked complete with timestamp |
| **Navigation** | Navigate to `/` (Home) |
| **Confirmation** | Yes - "Finish this workout?" |

---

## Inputs

| Input | Type | Validation | Behavior |
|-------|------|------------|----------|
| Weight | number | Positive, optional | Saves on blur, auto-populated from previous set |
| Reps | number | Positive integer, optional | Saves on blur |
| Exercise Name | text | Required, in AddExerciseModal | Creates new exercise on submit |

---

## State

### Data Loaded
- Active session for this template (resumed if exists)
- Last completed session for this template (for auto-populating exercises)
- Template details (name)

### Local State
- Current session with exercises and sets (Zustand store)
- Optimistic updates: UI updates immediately, database syncs in background
- Modal visibility states

### Key Hook: `useWorkout(templateId)`
Manages all workout logic including:
- Session initialization/resumption
- Exercise CRUD operations
- Set CRUD operations
- Session completion

---

## Navigation

### Entry Points
| From | Trigger |
|------|---------|
| Home Page | Tap "Start" on a TemplateCard |

### Exit Points
| Destination | Trigger | Condition |
|-------------|---------|-----------|
| `/` (Home) | Close button (X) | User confirms |
| `/` (Home) | Finish Workout button | User confirms |

---

## Edge Cases

### Empty State
- New workout with no exercises: Shows "Add Exercise" button only
- Exercise with no sets: Shows "Add Set" button only

### Loading State
- Spinner shown while fetching session data
- Inputs disabled during save operations

### Error State
- Database errors shown in modal dialog
- User can retry or dismiss

### Resume Behavior
- If user leaves mid-workout and returns to same template, session resumes automatically
- All previously entered data preserved

### Auto-population
- New session copies exercises from last completed session for same template
- If no history, uses template's default exercises
- New sets copy weight from previous set of same exercise

---

## Related Screens

- [Home Page](./home-page.md) - Entry point, shows all templates
- [History Page](./history-page.md) - View completed workouts
- [Session History Page](./session-history-page.md) - View details of past workout

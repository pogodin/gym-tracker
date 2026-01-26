# Gym Tracker

An Android app for tracking weightlifting workouts at the gym.

## Features

- **Workout Templates**: Create day templates (e.g., "Push Day", "Pull Day", "Leg Day") with predefined exercises
- **Session Tracking**: Log your workout sessions with exercises, sets, weights, and reps
- **Auto-populate from History**: New sessions automatically copy exercises and weights from your last completed workout for that day template
- **Resume Workouts**: If you close the app mid-workout, you can resume your active session instead of starting over
- **Reorder Exercises**: Drag and drop to reorder exercises within a session
- **Workout History**: View past workout sessions and track your progress over time

## Tech Stack

- **Language**: Kotlin
- **Architecture**: MVVM with ViewModels and StateFlow
- **Database**: Room (SQLite) for local persistence
- **Concurrency**: Kotlin Coroutines
- **Build System**: Gradle with Kotlin DSL

## Building

```bash
./gradlew assembleDebug
```

## Project Structure

```
app/src/main/java/com/gymtracker/
├── data/
│   ├── dao/          # Room Data Access Objects
│   └── entity/       # Database entities
└── viewmodel/        # ViewModels for UI state management
```

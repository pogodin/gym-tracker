-- Day Templates table
CREATE TABLE IF NOT EXISTS day_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Day Template Exercises table
CREATE TABLE IF NOT EXISTS day_template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (template_id) REFERENCES day_templates(id) ON DELETE CASCADE
);

-- Workout Sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  completed_at INTEGER,
  FOREIGN KEY (template_id) REFERENCES day_templates(id) ON DELETE CASCADE
);

-- Session Exercises table
CREATE TABLE IF NOT EXISTS session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
);

-- Session Sets table
CREATE TABLE IF NOT EXISTS session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  weight REAL,
  reps INTEGER,
  completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON day_template_exercises(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_template ON workout_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON workout_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON session_sets(exercise_id);

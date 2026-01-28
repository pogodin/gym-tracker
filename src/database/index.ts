import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'gym_tracker';

let db: SQLiteDBConnection | null = null;
let sqlite: SQLiteConnection | null = null;

const SCHEMA = `
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
`;

export async function initDatabase(): Promise<void> {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    // For web platform, use jeep-sqlite
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    await defineCustomElements(window);

    // Create the jeep-sqlite element
    const jeepEl = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');

    // Wait for the component to be ready
    await (jeepEl as any).componentOnReady();

    sqlite = new SQLiteConnection(CapacitorSQLite);
    await sqlite.initWebStore();
  } else {
    sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  // Create and open the database connection
  db = await sqlite.createConnection(
    DB_NAME,
    false,
    'no-encryption',
    1,
    false
  );

  await db.open();

  // Enable foreign keys
  await db.execute('PRAGMA foreign_keys = ON;');

  // Execute schema
  await db.execute(SCHEMA);

  console.log('Database initialized successfully');
}

export async function getDatabase(): Promise<SQLiteDBConnection> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db && sqlite) {
    await sqlite.closeConnection(DB_NAME, false);
    db = null;
  }
}

// Helper function to run a query and return results
export async function query<T>(sql: string, values?: unknown[]): Promise<T[]> {
  const database = await getDatabase();
  const result = await database.query(sql, values);
  return (result.values || []) as T[];
}

// Helper function to run a command (INSERT, UPDATE, DELETE)
export async function run(sql: string, values?: unknown[]): Promise<{ changes: number; lastId: number }> {
  const database = await getDatabase();
  const result = await database.run(sql, values);
  return {
    changes: result.changes?.changes || 0,
    lastId: result.changes?.lastId || 0,
  };
}

// Helper function to execute multiple statements
export async function execute(sql: string): Promise<void> {
  const database = await getDatabase();
  await database.execute(sql);
}

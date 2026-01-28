import { query, run, execute } from './index';
import type {
  DayTemplate,
  DayTemplateExercise,
  WorkoutSession,
  SessionExercise,
  SessionSet,
} from '../types';

// Export format matching Kotlin app structure
export interface ExportData {
  version: number;
  exportedAt: number;
  templates: Array<{
    id: number;
    name: string;
    createdAt: number;
    updatedAt: number;
    exercises: Array<{
      id: number;
      name: string;
      orderIndex: number;
    }>;
  }>;
  sessions: Array<{
    id: number;
    templateId: number;
    startedAt: number;
    completedAt: number | null;
    exercises: Array<{
      id: number;
      name: string;
      orderIndex: number;
      sets: Array<{
        id: number;
        setNumber: number;
        weight: number | null;
        reps: number | null;
        completed: boolean;
      }>;
    }>;
  }>;
}

export async function exportAllData(): Promise<ExportData> {
  // Get all templates with exercises
  const templates = await query<DayTemplate>(
    'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM day_templates'
  );

  const templatesWithExercises = await Promise.all(
    templates.map(async (template) => {
      const exercises = await query<DayTemplateExercise>(
        `SELECT id, name, order_index as orderIndex
         FROM day_template_exercises
         WHERE template_id = ?
         ORDER BY order_index`,
        [template.id]
      );
      return {
        ...template,
        exercises: exercises.map((e) => ({
          id: e.id,
          name: e.name,
          orderIndex: e.orderIndex,
        })),
      };
    })
  );

  // Get all sessions with exercises and sets
  const sessions = await query<WorkoutSession>(
    'SELECT id, template_id as templateId, started_at as startedAt, completed_at as completedAt FROM workout_sessions'
  );

  const sessionsWithData = await Promise.all(
    sessions.map(async (session) => {
      const exercises = await query<SessionExercise>(
        `SELECT id, name, order_index as orderIndex
         FROM session_exercises
         WHERE session_id = ?
         ORDER BY order_index`,
        [session.id]
      );

      const exercisesWithSets = await Promise.all(
        exercises.map(async (exercise) => {
          const sets = await query<SessionSet>(
            `SELECT id, set_number as setNumber, weight, reps, completed = 1 as completed
             FROM session_sets
             WHERE exercise_id = ?
             ORDER BY set_number`,
            [exercise.id]
          );
          return {
            id: exercise.id,
            name: exercise.name,
            orderIndex: exercise.orderIndex,
            sets: sets.map((s) => ({
              id: s.id,
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              completed: !!s.completed,
            })),
          };
        })
      );

      return {
        id: session.id,
        templateId: session.templateId,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        exercises: exercisesWithSets,
      };
    })
  );

  return {
    version: 1,
    exportedAt: Date.now(),
    templates: templatesWithExercises,
    sessions: sessionsWithData,
  };
}

export async function importData(data: ExportData): Promise<{ templatesImported: number; sessionsImported: number }> {
  if (data.version !== 1) {
    throw new Error(`Unsupported data version: ${data.version}`);
  }

  // Map old IDs to new IDs
  const templateIdMap = new Map<number, number>();
  const exerciseIdMap = new Map<number, number>();
  const sessionExerciseIdMap = new Map<number, number>();

  let templatesImported = 0;
  let sessionsImported = 0;

  // Import templates
  for (const template of data.templates) {
    const result = await run(
      'INSERT INTO day_templates (name, created_at, updated_at) VALUES (?, ?, ?)',
      [template.name, template.createdAt, template.updatedAt]
    );
    templateIdMap.set(template.id, result.lastId);
    templatesImported++;

    // Import template exercises
    for (const exercise of template.exercises) {
      const exResult = await run(
        'INSERT INTO day_template_exercises (template_id, name, order_index) VALUES (?, ?, ?)',
        [result.lastId, exercise.name, exercise.orderIndex]
      );
      exerciseIdMap.set(exercise.id, exResult.lastId);
    }
  }

  // Import sessions
  for (const session of data.sessions) {
    const newTemplateId = templateIdMap.get(session.templateId);
    if (!newTemplateId) {
      console.warn(`Skipping session ${session.id}: template ${session.templateId} not found`);
      continue;
    }

    const sessionResult = await run(
      'INSERT INTO workout_sessions (template_id, started_at, completed_at) VALUES (?, ?, ?)',
      [newTemplateId, session.startedAt, session.completedAt]
    );
    sessionsImported++;

    // Import session exercises
    for (const exercise of session.exercises) {
      const exResult = await run(
        'INSERT INTO session_exercises (session_id, name, order_index) VALUES (?, ?, ?)',
        [sessionResult.lastId, exercise.name, exercise.orderIndex]
      );
      sessionExerciseIdMap.set(exercise.id, exResult.lastId);

      // Import sets
      for (const set of exercise.sets) {
        await run(
          'INSERT INTO session_sets (exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, ?)',
          [exResult.lastId, set.setNumber, set.weight, set.reps, set.completed ? 1 : 0]
        );
      }
    }
  }

  return { templatesImported, sessionsImported };
}

export async function clearAllData(): Promise<void> {
  // Delete in reverse order of dependencies
  await execute('DELETE FROM session_sets');
  await execute('DELETE FROM session_exercises');
  await execute('DELETE FROM workout_sessions');
  await execute('DELETE FROM day_template_exercises');
  await execute('DELETE FROM day_templates');
}

export function downloadExportFile(data: ExportData, filename: string = 'gym-tracker-export.json'): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // Basic validation
        if (typeof data.version !== 'number' || !Array.isArray(data.templates) || !Array.isArray(data.sessions)) {
          throw new Error('Invalid export file format');
        }
        resolve(data as ExportData);
      } catch (err) {
        reject(new Error('Failed to parse import file: ' + (err instanceof Error ? err.message : 'Unknown error')));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

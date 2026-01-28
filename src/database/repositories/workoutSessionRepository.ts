import { query, run } from '../index';
import type { WorkoutSession, WorkoutSessionWithExercises } from '../../types';
import { getExercisesBySessionId } from './sessionExerciseRepository';

export async function getAllSessions(): Promise<WorkoutSession[]> {
  return query<WorkoutSession>(
    `SELECT id, template_id as templateId, started_at as startedAt, completed_at as completedAt
     FROM workout_sessions
     ORDER BY started_at DESC`
  );
}

export async function getSessionById(id: number): Promise<WorkoutSession | null> {
  const results = await query<WorkoutSession>(
    `SELECT id, template_id as templateId, started_at as startedAt, completed_at as completedAt
     FROM workout_sessions
     WHERE id = ?`,
    [id]
  );
  return results[0] || null;
}

export async function getSessionWithExercises(id: number): Promise<WorkoutSessionWithExercises | null> {
  const results = await query<WorkoutSession & { templateName: string }>(
    `SELECT ws.id, ws.template_id as templateId, ws.started_at as startedAt,
            ws.completed_at as completedAt, dt.name as templateName
     FROM workout_sessions ws
     JOIN day_templates dt ON ws.template_id = dt.id
     WHERE ws.id = ?`,
    [id]
  );

  const session = results[0];
  if (!session) return null;

  const exercises = await getExercisesBySessionId(id);
  return { ...session, exercises };
}

export async function getActiveSession(templateId: number): Promise<WorkoutSession | null> {
  const results = await query<WorkoutSession>(
    `SELECT id, template_id as templateId, started_at as startedAt, completed_at as completedAt
     FROM workout_sessions
     WHERE template_id = ? AND completed_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
    [templateId]
  );
  return results[0] || null;
}

export async function getLastCompletedSession(templateId: number): Promise<WorkoutSessionWithExercises | null> {
  const results = await query<WorkoutSession>(
    `SELECT id, template_id as templateId, started_at as startedAt, completed_at as completedAt
     FROM workout_sessions
     WHERE template_id = ? AND completed_at IS NOT NULL
     ORDER BY completed_at DESC
     LIMIT 1`,
    [templateId]
  );

  const session = results[0];
  if (!session) return null;

  const exercises = await getExercisesBySessionId(session.id);
  return { ...session, exercises };
}

export async function getCompletedSessions(): Promise<(WorkoutSession & { templateName: string })[]> {
  return query<WorkoutSession & { templateName: string }>(
    `SELECT ws.id, ws.template_id as templateId, ws.started_at as startedAt,
            ws.completed_at as completedAt, dt.name as templateName
     FROM workout_sessions ws
     JOIN day_templates dt ON ws.template_id = dt.id
     WHERE ws.completed_at IS NOT NULL
     ORDER BY ws.completed_at DESC`
  );
}

export async function createSession(templateId: number): Promise<WorkoutSession> {
  const now = Date.now();
  const result = await run(
    'INSERT INTO workout_sessions (template_id, started_at) VALUES (?, ?)',
    [templateId, now]
  );

  return {
    id: result.lastId,
    templateId,
    startedAt: now,
    completedAt: null,
  };
}

export async function completeSession(id: number): Promise<void> {
  const now = Date.now();
  await run('UPDATE workout_sessions SET completed_at = ? WHERE id = ?', [now, id]);
}

export async function deleteSession(id: number): Promise<void> {
  await run('DELETE FROM workout_sessions WHERE id = ?', [id]);
}

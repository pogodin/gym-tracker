import { query, run } from '../index';
import type { SessionExercise, SessionExerciseWithSets, CreateSessionExercise } from '../../types';
import { getSetsByExerciseId } from './sessionSetRepository';

export async function getExercisesBySessionId(sessionId: number): Promise<SessionExerciseWithSets[]> {
  const exercises = await query<SessionExercise>(
    `SELECT id, session_id as sessionId, name, order_index as orderIndex
     FROM session_exercises
     WHERE session_id = ?
     ORDER BY order_index`,
    [sessionId]
  );

  const exercisesWithSets: SessionExerciseWithSets[] = [];
  for (const exercise of exercises) {
    const sets = await getSetsByExerciseId(exercise.id);
    exercisesWithSets.push({ ...exercise, sets });
  }

  return exercisesWithSets;
}

export async function getExerciseById(id: number): Promise<SessionExercise | null> {
  const results = await query<SessionExercise>(
    `SELECT id, session_id as sessionId, name, order_index as orderIndex
     FROM session_exercises
     WHERE id = ?`,
    [id]
  );
  return results[0] || null;
}

export async function createSessionExercise(data: CreateSessionExercise): Promise<SessionExercise> {
  const result = await run(
    'INSERT INTO session_exercises (session_id, name, order_index) VALUES (?, ?, ?)',
    [data.sessionId, data.name, data.orderIndex]
  );

  return {
    id: result.lastId,
    sessionId: data.sessionId,
    name: data.name,
    orderIndex: data.orderIndex,
  };
}

export async function updateSessionExerciseName(id: number, name: string): Promise<void> {
  await run('UPDATE session_exercises SET name = ? WHERE id = ?', [name, id]);
}

export async function updateSessionExerciseOrder(id: number, orderIndex: number): Promise<void> {
  await run('UPDATE session_exercises SET order_index = ? WHERE id = ?', [orderIndex, id]);
}

export async function reorderSessionExercises(
  exercises: { id: number; orderIndex: number }[]
): Promise<void> {
  for (const exercise of exercises) {
    await updateSessionExerciseOrder(exercise.id, exercise.orderIndex);
  }
}

export async function deleteSessionExercise(id: number): Promise<void> {
  await run('DELETE FROM session_exercises WHERE id = ?', [id]);
}

export async function getNextExerciseOrderIndex(sessionId: number): Promise<number> {
  const results = await query<{ maxOrder: number | null }>(
    'SELECT MAX(order_index) as maxOrder FROM session_exercises WHERE session_id = ?',
    [sessionId]
  );
  return (results[0]?.maxOrder ?? -1) + 1;
}

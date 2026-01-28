import { query, run } from '../index';
import type { SessionSet, CreateSessionSet, UpdateSessionSet } from '../../types';

export async function getSetsByExerciseId(exerciseId: number): Promise<SessionSet[]> {
  return query<SessionSet>(
    `SELECT id, exercise_id as exerciseId, set_number as setNumber, weight, reps,
            completed = 1 as completed
     FROM session_sets
     WHERE exercise_id = ?
     ORDER BY set_number`,
    [exerciseId]
  );
}

export async function getSetById(id: number): Promise<SessionSet | null> {
  const results = await query<SessionSet>(
    `SELECT id, exercise_id as exerciseId, set_number as setNumber, weight, reps,
            completed = 1 as completed
     FROM session_sets
     WHERE id = ?`,
    [id]
  );
  return results[0] || null;
}

export async function createSet(data: CreateSessionSet): Promise<SessionSet> {
  const result = await run(
    'INSERT INTO session_sets (exercise_id, set_number, weight, reps, completed) VALUES (?, ?, ?, ?, 0)',
    [data.exerciseId, data.setNumber, data.weight ?? null, data.reps ?? null]
  );

  return {
    id: result.lastId,
    exerciseId: data.exerciseId,
    setNumber: data.setNumber,
    weight: data.weight ?? null,
    reps: data.reps ?? null,
    completed: false,
  };
}

export async function updateSet(data: UpdateSessionSet): Promise<void> {
  const current = await getSetById(data.id);
  if (!current) return;

  const weight = data.weight !== undefined ? data.weight : current.weight;
  const reps = data.reps !== undefined ? data.reps : current.reps;
  const completed = data.completed !== undefined ? data.completed : current.completed;

  await run(
    'UPDATE session_sets SET weight = ?, reps = ?, completed = ? WHERE id = ?',
    [weight, reps, completed ? 1 : 0, data.id]
  );
}

export async function deleteSet(id: number): Promise<void> {
  await run('DELETE FROM session_sets WHERE id = ?', [id]);
}

export async function getNextSetNumber(exerciseId: number): Promise<number> {
  const results = await query<{ maxSet: number | null }>(
    'SELECT MAX(set_number) as maxSet FROM session_sets WHERE exercise_id = ?',
    [exerciseId]
  );
  return (results[0]?.maxSet ?? 0) + 1;
}

export async function renumberSets(exerciseId: number): Promise<void> {
  const sets = await getSetsByExerciseId(exerciseId);
  for (let i = 0; i < sets.length; i++) {
    if (sets[i].setNumber !== i + 1) {
      await run('UPDATE session_sets SET set_number = ? WHERE id = ?', [i + 1, sets[i].id]);
    }
  }
}

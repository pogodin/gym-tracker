import { query, run } from '../index';
import type {
  DayTemplate,
  DayTemplateExercise,
  DayTemplateWithExercises,
  CreateDayTemplate,
  UpdateDayTemplate,
  CreateDayTemplateExercise,
} from '../../types';

// Day Template CRUD operations

export async function getAllTemplates(): Promise<DayTemplate[]> {
  return query<DayTemplate>(
    'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM day_templates ORDER BY name'
  );
}

export async function getTemplateById(id: number): Promise<DayTemplate | null> {
  const results = await query<DayTemplate>(
    'SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM day_templates WHERE id = ?',
    [id]
  );
  return results[0] || null;
}

export async function getTemplateWithExercises(id: number): Promise<DayTemplateWithExercises | null> {
  const template = await getTemplateById(id);
  if (!template) return null;

  const exercises = await getExercisesByTemplateId(id);
  return { ...template, exercises };
}

export async function createTemplate(data: CreateDayTemplate): Promise<DayTemplate> {
  const now = Date.now();
  const result = await run(
    'INSERT INTO day_templates (name, created_at, updated_at) VALUES (?, ?, ?)',
    [data.name, now, now]
  );

  return {
    id: result.lastId,
    name: data.name,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTemplate(data: UpdateDayTemplate): Promise<void> {
  const now = Date.now();
  await run(
    'UPDATE day_templates SET name = ?, updated_at = ? WHERE id = ?',
    [data.name, now, data.id]
  );
}

export async function deleteTemplate(id: number): Promise<void> {
  await run('DELETE FROM day_templates WHERE id = ?', [id]);
}

// Day Template Exercise operations

export async function getExercisesByTemplateId(templateId: number): Promise<DayTemplateExercise[]> {
  return query<DayTemplateExercise>(
    `SELECT id, template_id as templateId, name, order_index as orderIndex
     FROM day_template_exercises
     WHERE template_id = ?
     ORDER BY order_index`,
    [templateId]
  );
}

export async function createTemplateExercise(data: CreateDayTemplateExercise): Promise<DayTemplateExercise> {
  const result = await run(
    'INSERT INTO day_template_exercises (template_id, name, order_index) VALUES (?, ?, ?)',
    [data.templateId, data.name, data.orderIndex]
  );

  return {
    id: result.lastId,
    templateId: data.templateId,
    name: data.name,
    orderIndex: data.orderIndex,
  };
}

export async function updateTemplateExercise(id: number, name: string): Promise<void> {
  await run('UPDATE day_template_exercises SET name = ? WHERE id = ?', [name, id]);
}

export async function updateTemplateExerciseOrder(id: number, orderIndex: number): Promise<void> {
  await run('UPDATE day_template_exercises SET order_index = ? WHERE id = ?', [orderIndex, id]);
}

export async function reorderTemplateExercises(
  exercises: { id: number; orderIndex: number }[]
): Promise<void> {
  for (const exercise of exercises) {
    await updateTemplateExerciseOrder(exercise.id, exercise.orderIndex);
  }
}

export async function deleteTemplateExercise(id: number): Promise<void> {
  await run('DELETE FROM day_template_exercises WHERE id = ?', [id]);
}

export async function getNextExerciseOrderIndex(templateId: number): Promise<number> {
  const results = await query<{ maxOrder: number | null }>(
    'SELECT MAX(order_index) as maxOrder FROM day_template_exercises WHERE template_id = ?',
    [templateId]
  );
  return (results[0]?.maxOrder ?? -1) + 1;
}

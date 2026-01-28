import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { TemplateForm } from '../components/templates';
import { LoadingSpinner } from '../components/common';
import {
  useTemplateWithExercises,
  useCreateTemplate,
  useUpdateTemplate,
  useCreateTemplateExercise,
  useDeleteTemplateExercise,
  useReorderTemplateExercises,
} from '../database/hooks/useTemplates';

export default function TemplatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const templateId = id ? parseInt(id, 10) : undefined;

  const { data: template, isLoading } = useTemplateWithExercises(templateId);
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const createExerciseMutation = useCreateTemplateExercise();
  const deleteExerciseMutation = useDeleteTemplateExercise();
  const reorderExercisesMutation = useReorderTemplateExercises();

  const [saving, setSaving] = useState(false);

  const handleSave = async (name: string, exercises: { name: string; orderIndex: number }[]) => {
    setSaving(true);
    try {
      if (templateId && template) {
        // Update existing template
        await updateTemplateMutation.mutateAsync({ id: templateId, name });

        // Get current exercises
        const currentExercises = template.exercises;

        // Delete removed exercises
        for (const existing of currentExercises) {
          if (!exercises.some((e) => e.name === existing.name && e.orderIndex === existing.orderIndex)) {
            await deleteExerciseMutation.mutateAsync({ id: existing.id, templateId });
          }
        }

        // Add new exercises and reorder
        const exercisesToReorder: { id: number; orderIndex: number }[] = [];
        for (const exercise of exercises) {
          const existing = currentExercises.find((e) => e.name === exercise.name);
          if (existing) {
            exercisesToReorder.push({ id: existing.id, orderIndex: exercise.orderIndex });
          } else {
            await createExerciseMutation.mutateAsync({
              templateId,
              name: exercise.name,
              orderIndex: exercise.orderIndex,
            });
          }
        }

        if (exercisesToReorder.length > 0) {
          await reorderExercisesMutation.mutateAsync({ exercises: exercisesToReorder, templateId });
        }
      } else {
        // Create new template
        const newTemplate = await createTemplateMutation.mutateAsync({ name });

        // Add exercises
        for (const exercise of exercises) {
          await createExerciseMutation.mutateAsync({
            templateId: newTemplate.id,
            name: exercise.name,
            orderIndex: exercise.orderIndex,
          });
        }
      }

      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  if (templateId && isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">
            {templateId ? 'Edit Template' : 'New Template'}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <TemplateForm
            template={template}
            onSave={handleSave}
            onCancel={() => navigate(-1)}
            isLoading={saving}
          />
        </div>
      </main>
    </div>
  );
}

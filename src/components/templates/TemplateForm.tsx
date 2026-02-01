import { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input } from '../common';
import type { DayTemplateWithExercises } from '../../types';

interface TemplateFormProps {
  template?: DayTemplateWithExercises | null;
  onSave: (name: string, exercises: { name: string; orderIndex: number }[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface SortableExerciseItemProps {
  exercise: { id: string; name: string };
  index: number;
  onNameChange: (name: string) => void;
  onDelete: () => void;
}

function SortableExerciseItem({ exercise, index, onNameChange, onDelete }: SortableExerciseItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-gray-50 rounded-lg p-3"
    >
      <button
        type="button"
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span className="text-gray-500 font-medium w-6">{index + 1}.</span>
      <Input
        label="Exercise Name"
        value={exercise.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Exercise name"
        className="flex-1"
        id={`exercise-input-${index}`}
        aria-label={`exercise-input-${index}`}
        data-testid={`exercise-input-${index}`}
      />
      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-600"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function TemplateForm({ template, onSave, onCancel, isLoading }: TemplateFormProps) {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setExercises(
        template.exercises.map((e) => ({
          id: `existing-${e.id}`,
          name: e.name,
        }))
      );
    }
  }, [template]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      { id: `new-${Date.now()}`, name: '' },
    ]);
  };

  const updateExerciseName = (index: number, newName: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], name: newName };
    setExercises(updated);
  };

  const deleteExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);

    const newExercises = [...exercises];
    const [removed] = newExercises.splice(oldIndex, 1);
    newExercises.splice(newIndex, 0, removed);
    setExercises(newExercises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validExercises = exercises
      .filter((ex) => ex.name.trim())
      .map((ex, index) => ({
        name: ex.name.trim(),
        orderIndex: index,
      }));
    await onSave(name.trim(), validExercises);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Template Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Push Day, Leg Day"
        required
        id="template-name-input"
        aria-label="template-name-input"
        data-testid="template-name-input"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exercises
        </label>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 mb-3">
              {exercises.map((exercise, index) => (
                <SortableExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  onNameChange={(name) => updateExerciseName(index, name)}
                  onDelete={() => deleteExercise(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button type="button" variant="secondary" onClick={addExercise} className="w-full">
          + Add Exercise
        </Button>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
          {template ? 'Save Changes' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}

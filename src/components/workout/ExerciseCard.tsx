import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SetRow } from './SetRow';
import { Button, ConfirmDialog } from '../common';
import type { SessionExerciseWithSets, UpdateSessionSet } from '../../types';

interface ExerciseCardProps {
  exercise: SessionExerciseWithSets;
  onAddSet: () => void;
  onUpdateSet: (data: UpdateSessionSet) => void;
  onDeleteSet: (setId: number) => void;
  onDeleteExercise: () => void;
}

export function ExerciseCard({
  exercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDeleteExercise,
}: ExerciseCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const completedSets = exercise.sets.filter((s) => s.completed).length;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white rounded-lg shadow-md overflow-hidden"
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{exercise.name}</h3>
            <p className="text-sm text-gray-500">
              {completedSets} / {exercise.sets.length} sets completed
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-600"
            aria-label="Delete exercise"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-2">
          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              exerciseName={exercise.name}
              setIndex={index}
              onUpdate={onUpdateSet}
              onDelete={() => onDeleteSet(set.id)}
            />
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAddSet}
            className="w-full mt-2"
            aria-label={`add-set-${exercise.name}`}
          >
            + Add Set
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={onDeleteExercise}
        title="Delete Exercise"
        message={`Are you sure you want to delete "${exercise.name}" and all its sets?`}
        confirmText="Delete"
      />
    </>
  );
}

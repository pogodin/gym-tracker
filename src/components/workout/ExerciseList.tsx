import { DndContext, closestCenter, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ExerciseCard } from './ExerciseCard';
import type { SessionExerciseWithSets, UpdateSessionSet } from '../../types';

interface ExerciseListProps {
  exercises: SessionExerciseWithSets[];
  onReorder: (exercises: SessionExerciseWithSets[]) => void;
  onAddSet: (exerciseId: number) => void;
  onUpdateSet: (exerciseId: number, data: UpdateSessionSet) => void;
  onDeleteSet: (exerciseId: number, setId: number) => void;
  onDeleteExercise: (exerciseId: number) => void;
}

export function ExerciseList({
  exercises,
  onReorder,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDeleteExercise,
}: ExerciseListProps) {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((e) => e.id.toString() === active.id);
    const newIndex = exercises.findIndex((e) => e.id.toString() === over.id);

    const newExercises = [...exercises];
    const [removed] = newExercises.splice(oldIndex, 1);
    newExercises.splice(newIndex, 0, removed);

    onReorder(newExercises);
  };

  if (exercises.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No exercises yet. Add one to get started!
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={exercises.map((e) => e.id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onAddSet={() => onAddSet(exercise.id)}
              onUpdateSet={(data) => onUpdateSet(exercise.id, data)}
              onDeleteSet={(setId) => onDeleteSet(exercise.id, setId)}
              onDeleteExercise={() => onDeleteExercise(exercise.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

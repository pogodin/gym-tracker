import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkout } from '../hooks/useWorkout';
import { useTemplate } from '../database/hooks/useTemplates';
import { ExerciseList, AddExerciseModal } from '../components/workout';
import { Button, LoadingSpinner, ConfirmDialog } from '../components/common';

export default function WorkoutPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const numTemplateId = parseInt(templateId!, 10);

  const { data: template } = useTemplate(numTemplateId);
  const {
    session,
    isLoading,
    error,
    hasActiveSession,
    startWorkout,
    finishWorkout,
    addExercise,
    removeExercise,
    reorderExercises,
    addSet,
    updateSet,
    removeSet,
  } = useWorkout(numTemplateId);

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Guard to prevent multiple startWorkout calls
  const hasStartedRef = useRef(false);

  // Start workout on mount (only once)
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startWorkout();
    }
  }, [startWorkout]);

  const handleFinish = async () => {
    await finishWorkout();
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">
            {hasActiveSession ? 'Resuming workout...' : 'Starting workout...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900">
                {template?.name || 'Workout'}
              </h1>
              <p className="text-sm text-gray-500">
                {completedSets} / {totalSets} sets
              </p>
            </div>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <ExerciseList
          exercises={session.exercises}
          onReorder={reorderExercises}
          onAddSet={addSet}
          onUpdateSet={updateSet}
          onDeleteSet={removeSet}
          onDeleteExercise={removeExercise}
        />

        <Button
          variant="secondary"
          className="w-full mt-4"
          onClick={() => setShowAddExercise(true)}
        >
          + Add Exercise
        </Button>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-lg mx-auto">
          <Button
            variant="primary"
            className="w-full"
            size="lg"
            onClick={() => setShowFinishConfirm(true)}
          >
            Finish Workout
          </Button>
        </div>
      </div>

      {/* Modals */}
      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAdd={addExercise}
      />

      <ConfirmDialog
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={handleFinish}
        title="Finish Workout"
        message="Are you sure you want to finish this workout? Your progress will be saved."
        confirmText="Finish"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Leave Workout"
        message="Your workout progress is automatically saved. You can resume this workout later."
        confirmText="Leave"
        cancelText="Stay"
        variant="primary"
      />
    </div>
  );
}

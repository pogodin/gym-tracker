import { useCallback, useEffect } from 'react';
import { useWorkoutStore } from '../stores/workoutStore';
import {
  useActiveSession,
  useLastCompletedSession,
  useCreateSession,
  useCompleteSession,
  useCreateSessionExercise,
  useDeleteSessionExercise,
  useReorderSessionExercises,
  useCreateSet,
  useUpdateSet,
  useDeleteSet,
  useSession,
} from '../database/hooks/useSessions';
import { useTemplateWithExercises } from '../database/hooks/useTemplates';
import * as exerciseRepo from '../database/repositories/sessionExerciseRepository';
import * as setRepo from '../database/repositories/sessionSetRepository';
import * as sessionRepo from '../database/repositories/workoutSessionRepository';
import * as templateRepo from '../database/repositories/dayTemplateRepository';
import type { SessionExerciseWithSets, UpdateSessionSet } from '../types';

export function useWorkout(templateId: number) {
  const {
    currentSession,
    setCurrentSession,
    setLoading,
    setError,
    addExerciseLocally,
    removeExerciseLocally,
    reorderExercisesLocally,
    addSetLocally,
    updateSetLocally,
    removeSetLocally,
    clearSession,
  } = useWorkoutStore();

  const { data: activeSession, isLoading: activeLoading } = useActiveSession(templateId);
  const { data: lastCompleted } = useLastCompletedSession(templateId);
  const { data: template } = useTemplateWithExercises(templateId);
  const { data: sessionData, refetch: refetchSession } = useSession(currentSession?.id);

  const createSessionMutation = useCreateSession();
  const completeSessionMutation = useCompleteSession();
  const createExerciseMutation = useCreateSessionExercise();
  const deleteExerciseMutation = useDeleteSessionExercise();
  const reorderExercisesMutation = useReorderSessionExercises();
  const createSetMutation = useCreateSet();
  const updateSetMutation = useUpdateSet();
  const deleteSetMutation = useDeleteSet();

  // Sync session data from query to store
  useEffect(() => {
    if (sessionData) {
      setCurrentSession(sessionData);
    }
  }, [sessionData, setCurrentSession]);

  // Start or resume workout
  const startWorkout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check for active session first
      if (activeSession) {
        // Resume existing session
        const session = await refetchSession();
        if (session.data) {
          setCurrentSession(session.data);
        }
        return;
      }

      // Create new session
      const newSession = await createSessionMutation.mutateAsync(templateId);

      // Fetch template directly to ensure we have the latest data
      const freshTemplate = await templateRepo.getTemplateWithExercises(templateId);

      // Auto-populate from last completed session or template
      if (lastCompleted && lastCompleted.exercises.length > 0) {
        // Copy exercises and sets from last completed session
        for (const exercise of lastCompleted.exercises) {
          const newExercise = await exerciseRepo.createSessionExercise({
            sessionId: newSession.id,
            name: exercise.name,
            orderIndex: exercise.orderIndex,
          });

          // Copy sets
          for (const set of exercise.sets) {
            await setRepo.createSet({
              exerciseId: newExercise.id,
              setNumber: set.setNumber,
              weight: set.weight,
              reps: set.reps,
            });
          }
        }
      } else if (freshTemplate && freshTemplate.exercises.length > 0) {
        // Create exercises from template (no sets - those come from history or are added manually)
        for (const exercise of freshTemplate.exercises) {
          await exerciseRepo.createSessionExercise({
            sessionId: newSession.id,
            name: exercise.name,
            orderIndex: exercise.orderIndex,
          });
        }
      }

      // Fetch the populated session directly
      const populatedSession = await sessionRepo.getSessionWithExercises(newSession.id);
      if (populatedSession) {
        setCurrentSession(populatedSession);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workout');
    } finally {
      setLoading(false);
    }
  }, [
    activeSession,
    lastCompleted,
    templateId,
    createSessionMutation,
    setCurrentSession,
    setLoading,
    setError,
  ]);

  // Finish workout
  const finishWorkout = useCallback(async () => {
    if (!currentSession) return;

    try {
      await completeSessionMutation.mutateAsync({
        id: currentSession.id,
        templateId,
      });
      clearSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete workout');
    }
  }, [currentSession, templateId, completeSessionMutation, clearSession, setError]);

  // Add exercise
  const addExercise = useCallback(
    async (name: string) => {
      if (!currentSession) return;

      const orderIndex = await exerciseRepo.getNextExerciseOrderIndex(currentSession.id);
      const newExercise = await createExerciseMutation.mutateAsync({
        sessionId: currentSession.id,
        name,
        orderIndex,
      });

      addExerciseLocally({ ...newExercise, sets: [] });
    },
    [currentSession, createExerciseMutation, addExerciseLocally]
  );

  // Remove exercise
  const removeExercise = useCallback(
    async (exerciseId: number) => {
      if (!currentSession) return;

      removeExerciseLocally(exerciseId);
      await deleteExerciseMutation.mutateAsync({
        id: exerciseId,
        sessionId: currentSession.id,
      });
    },
    [currentSession, deleteExerciseMutation, removeExerciseLocally]
  );

  // Reorder exercises
  const reorderExercises = useCallback(
    async (exercises: SessionExerciseWithSets[]) => {
      if (!currentSession) return;

      const reordered = exercises.map((e, index) => ({
        ...e,
        orderIndex: index,
      }));

      reorderExercisesLocally(reordered);

      await reorderExercisesMutation.mutateAsync({
        exercises: reordered.map((e) => ({ id: e.id, orderIndex: e.orderIndex })),
        sessionId: currentSession.id,
      });
    },
    [currentSession, reorderExercisesMutation, reorderExercisesLocally]
  );

  // Add set
  const addSet = useCallback(
    async (exerciseId: number, weight?: number, reps?: number) => {
      if (!currentSession) return;

      const setNumber = await setRepo.getNextSetNumber(exerciseId);
      const newSet = await createSetMutation.mutateAsync({
        data: {
          exerciseId,
          setNumber,
          weight: weight ?? null,
          reps: reps ?? null,
        },
        sessionId: currentSession.id,
      });

      addSetLocally(exerciseId, newSet);
    },
    [currentSession, createSetMutation, addSetLocally]
  );

  // Update set
  const updateSet = useCallback(
    async (exerciseId: number, data: UpdateSessionSet) => {
      if (!currentSession) return;

      const exercise = currentSession.exercises.find((e) => e.id === exerciseId);
      const existingSet = exercise?.sets.find((s) => s.id === data.id);
      if (!existingSet) return;

      const updatedSet = {
        ...existingSet,
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.reps !== undefined && { reps: data.reps }),
        ...(data.completed !== undefined && { completed: data.completed }),
      };

      updateSetLocally(exerciseId, updatedSet);

      await updateSetMutation.mutateAsync({
        data,
        sessionId: currentSession.id,
      });
    },
    [currentSession, updateSetMutation, updateSetLocally]
  );

  // Remove set
  const removeSet = useCallback(
    async (exerciseId: number, setId: number) => {
      if (!currentSession) return;

      removeSetLocally(exerciseId, setId);

      await deleteSetMutation.mutateAsync({
        id: setId,
        sessionId: currentSession.id,
      });
    },
    [currentSession, deleteSetMutation, removeSetLocally]
  );

  return {
    session: currentSession,
    isLoading: activeLoading || useWorkoutStore.getState().isLoading,
    error: useWorkoutStore.getState().error,
    hasActiveSession: !!activeSession,
    startWorkout,
    finishWorkout,
    addExercise,
    removeExercise,
    reorderExercises,
    addSet,
    updateSet,
    removeSet,
  };
}

import { create } from 'zustand';
import type { WorkoutSessionWithExercises, SessionExerciseWithSets, SessionSet } from '../types';

interface WorkoutState {
  // Current active session
  currentSession: WorkoutSessionWithExercises | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentSession: (session: WorkoutSessionWithExercises | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Local state updates (optimistic)
  addExerciseLocally: (exercise: SessionExerciseWithSets) => void;
  removeExerciseLocally: (exerciseId: number) => void;
  updateExerciseNameLocally: (exerciseId: number, name: string) => void;
  reorderExercisesLocally: (exercises: SessionExerciseWithSets[]) => void;

  addSetLocally: (exerciseId: number, set: SessionSet) => void;
  updateSetLocally: (exerciseId: number, set: SessionSet) => void;
  removeSetLocally: (exerciseId: number, setId: number) => void;

  clearSession: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentSession: null,
  isLoading: false,
  error: null,

  setCurrentSession: (session) => set({ currentSession: session }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addExerciseLocally: (exercise) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises: [...currentSession.exercises, exercise],
      },
    });
  },

  removeExerciseLocally: (exerciseId) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises: currentSession.exercises.filter((e) => e.id !== exerciseId),
      },
    });
  },

  updateExerciseNameLocally: (exerciseId, name) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises: currentSession.exercises.map((e) =>
          e.id === exerciseId ? { ...e, name } : e
        ),
      },
    });
  },

  reorderExercisesLocally: (exercises) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises,
      },
    });
  },

  addSetLocally: (exerciseId, newSet) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises: currentSession.exercises.map((e) =>
          e.id === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e
        ),
      },
    });
  },

  updateSetLocally: (exerciseId, updatedSet) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises: currentSession.exercises.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                sets: e.sets.map((s) => (s.id === updatedSet.id ? updatedSet : s)),
              }
            : e
        ),
      },
    });
  },

  removeSetLocally: (exerciseId, setId) => {
    const { currentSession } = get();
    if (!currentSession) return;

    set({
      currentSession: {
        ...currentSession,
        exercises: currentSession.exercises.map((e) =>
          e.id === exerciseId
            ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
            : e
        ),
      },
    });
  },

  clearSession: () => set({ currentSession: null, error: null }),
}));

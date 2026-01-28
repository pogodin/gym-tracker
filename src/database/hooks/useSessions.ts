import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as sessionRepo from '../repositories/workoutSessionRepository';
import * as exerciseRepo from '../repositories/sessionExerciseRepository';
import * as setRepo from '../repositories/sessionSetRepository';
import type { CreateSessionExercise, CreateSessionSet, UpdateSessionSet } from '../../types';

export const sessionKeys = {
  all: ['sessions'] as const,
  completed: ['sessions', 'completed'] as const,
  detail: (id: number) => ['sessions', id] as const,
  active: (templateId: number) => ['sessions', 'active', templateId] as const,
  lastCompleted: (templateId: number) => ['sessions', 'lastCompleted', templateId] as const,
};

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: sessionRepo.getAllSessions,
  });
}

export function useCompletedSessions() {
  return useQuery({
    queryKey: sessionKeys.completed,
    queryFn: sessionRepo.getCompletedSessions,
  });
}

export function useSession(id: number | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(id!),
    queryFn: () => sessionRepo.getSessionWithExercises(id!),
    enabled: id !== undefined,
  });
}

export function useActiveSession(templateId: number | undefined) {
  return useQuery({
    queryKey: sessionKeys.active(templateId!),
    queryFn: () => sessionRepo.getActiveSession(templateId!),
    enabled: templateId !== undefined,
  });
}

export function useLastCompletedSession(templateId: number | undefined) {
  return useQuery({
    queryKey: sessionKeys.lastCompleted(templateId!),
    queryFn: () => sessionRepo.getLastCompletedSession(templateId!),
    enabled: templateId !== undefined,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: number) => sessionRepo.createSession(templateId),
    onSuccess: (_, templateId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionKeys.active(templateId) });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; templateId: number }) =>
      sessionRepo.completeSession(id),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionKeys.completed });
      queryClient.invalidateQueries({ queryKey: sessionKeys.active(templateId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lastCompleted(templateId) });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => sessionRepo.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionKeys.completed });
    },
  });
}

// Session Exercise hooks

export function useCreateSessionExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSessionExercise) => exerciseRepo.createSessionExercise(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(data.sessionId) });
    },
  });
}

export function useUpdateSessionExerciseName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string; sessionId: number }) =>
      exerciseRepo.updateSessionExerciseName(id, name),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(data.sessionId) });
    },
  });
}

export function useReorderSessionExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exercises,
    }: {
      exercises: { id: number; orderIndex: number }[];
      sessionId: number;
    }) => exerciseRepo.reorderSessionExercises(exercises),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(data.sessionId) });
    },
  });
}

export function useDeleteSessionExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; sessionId: number }) =>
      exerciseRepo.deleteSessionExercise(id),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(data.sessionId) });
    },
  });
}

// Session Set hooks

export function useCreateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: { data: CreateSessionSet; sessionId: number }) =>
      setRepo.createSet(data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

export function useUpdateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data }: { data: UpdateSessionSet; sessionId: number }) =>
      setRepo.updateSet(data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; sessionId: number }) => setRepo.deleteSet(id),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

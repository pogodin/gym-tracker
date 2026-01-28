import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as templateRepo from '../repositories/dayTemplateRepository';
import type { CreateDayTemplate, UpdateDayTemplate, CreateDayTemplateExercise } from '../../types';

export const templateKeys = {
  all: ['templates'] as const,
  detail: (id: number) => ['templates', id] as const,
  withExercises: (id: number) => ['templates', id, 'exercises'] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: templateRepo.getAllTemplates,
  });
}

export function useTemplate(id: number | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id!),
    queryFn: () => templateRepo.getTemplateById(id!),
    enabled: id !== undefined,
  });
}

export function useTemplateWithExercises(id: number | undefined) {
  return useQuery({
    queryKey: templateKeys.withExercises(id!),
    queryFn: () => templateRepo.getTemplateWithExercises(id!),
    enabled: id !== undefined,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDayTemplate) => templateRepo.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDayTemplate) => templateRepo.updateTemplate(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => templateRepo.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

// Template exercise hooks

export function useCreateTemplateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDayTemplateExercise) => templateRepo.createTemplateExercise(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.withExercises(data.templateId) });
    },
  });
}

export function useUpdateTemplateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string; templateId: number }) =>
      templateRepo.updateTemplateExercise(id, name),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.withExercises(data.templateId) });
    },
  });
}

export function useReorderTemplateExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exercises,
    }: {
      exercises: { id: number; orderIndex: number }[];
      templateId: number;
    }) => templateRepo.reorderTemplateExercises(exercises),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.withExercises(data.templateId) });
    },
  });
}

export function useDeleteTemplateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; templateId: number }) =>
      templateRepo.deleteTemplateExercise(id),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.withExercises(data.templateId) });
    },
  });
}

export function useNextExerciseOrderIndex(templateId: number) {
  return useQuery({
    queryKey: ['templates', templateId, 'nextOrder'],
    queryFn: () => templateRepo.getNextExerciseOrderIndex(templateId),
    enabled: templateId !== undefined,
  });
}

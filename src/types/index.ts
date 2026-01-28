// Day Template - represents a workout template (e.g., "Push Day", "Leg Day")
export interface DayTemplate {
  id: number;
  name: string;
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number;
}

// Day Template Exercise - an exercise within a template
export interface DayTemplateExercise {
  id: number;
  templateId: number;
  name: string;
  orderIndex: number;
}

// Workout Session - an actual workout instance
export interface WorkoutSession {
  id: number;
  templateId: number;
  startedAt: number; // Unix timestamp in milliseconds
  completedAt: number | null; // null if workout is in progress
}

// Session Exercise - an exercise within a workout session
export interface SessionExercise {
  id: number;
  sessionId: number;
  name: string;
  orderIndex: number;
}

// Session Set - a single set within an exercise
export interface SessionSet {
  id: number;
  exerciseId: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

// Combined types for UI convenience
export interface DayTemplateWithExercises extends DayTemplate {
  exercises: DayTemplateExercise[];
}

export interface SessionExerciseWithSets extends SessionExercise {
  sets: SessionSet[];
}

export interface WorkoutSessionWithExercises extends WorkoutSession {
  exercises: SessionExerciseWithSets[];
  templateName?: string;
}

// Form/Input types
export interface CreateDayTemplate {
  name: string;
}

export interface UpdateDayTemplate {
  id: number;
  name: string;
}

export interface CreateDayTemplateExercise {
  templateId: number;
  name: string;
  orderIndex: number;
}

export interface CreateSessionExercise {
  sessionId: number;
  name: string;
  orderIndex: number;
}

export interface CreateSessionSet {
  exerciseId: number;
  setNumber: number;
  weight?: number | null;
  reps?: number | null;
}

export interface UpdateSessionSet {
  id: number;
  weight?: number | null;
  reps?: number | null;
  completed?: boolean;
}

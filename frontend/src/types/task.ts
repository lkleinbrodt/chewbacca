// Task types

// Common task interface
export interface BaseTask {
  id: string;
  content: string;
  duration: number; // in minutes
  is_completed: boolean;
  task_type: "one-off" | "recurring";
  created_at: string;
  updated_at: string;
}

// One-off task specific fields
export interface OneOffTask extends BaseTask {
  task_type: "one-off";
  due_by: string;
  dependencies: string[];
}

// Recurrence pattern specification
export interface RecurrencePattern {
  type: "daily" | "weekly" | "custom";
  days?: string[]; // For weekly or custom recurrence, contains days of week
}

// Time window for recurring tasks
export interface TimeWindow {
  start: string | null; // Format: "HH:MM"
  end: string | null; // Format: "HH:MM"
}

// Recurring task specific fields
export interface RecurringTask extends BaseTask {
  task_type: "recurring";
  recurrence: RecurrencePattern;
  time_window: TimeWindow;
  is_active: boolean;
}

// Union type for all task types
export type Task = OneOffTask | RecurringTask;

// Form data types for creating/updating tasks
export interface TaskFormData {
  content: string;
  duration: number; // in minutes
  task_type: "one-off" | "recurring";
  is_completed?: boolean;
}

export interface OneOffTaskFormData extends TaskFormData {
  task_type: "one-off";
  due_by: Date;
  dependencies?: string[];
}

export interface RecurringTaskFormData extends TaskFormData {
  task_type: "recurring";
  recurrence: RecurrencePattern;
  time_window?: {
    start: string;
    end: string;
  };
  is_active?: boolean;
}

// Response type for task creation
export interface TaskCreationResponse {
  id: string;
  content: string;
  message: string;
}

// Filter types for task listing
export interface TaskFilters {
  type?: "one-off" | "recurring";
  is_completed?: boolean;
}

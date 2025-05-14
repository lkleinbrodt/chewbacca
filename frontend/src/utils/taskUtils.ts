import type {
  OneOffTask,
  OneOffTaskFormData,
  RecurringTask,
  RecurringTaskFormData,
  Task,
} from "@/types/task";

/**
 * Convert form data to API format
 */
export const formatTaskForApi = (
  formData: OneOffTaskFormData | RecurringTaskFormData
) => {
  if (formData.task_type === "one-off") {
    return {
      content: formData.content,
      duration: Number(formData.duration),
      dependencies: formData.dependencies || [],
      due_by: formData.due_by.toISOString(),
      task_type: "one-off" as const,
      is_completed: formData.is_completed || false,
    };
  } else {
    // Recurring task
    return {
      content: formData.content,
      duration: Number(formData.duration),
      task_type: "recurring" as const,
      recurrence: formData.recurrence,
      time_window: formData.time_window || { start: null, end: null },
      is_active: formData.is_active || true,
    };
  }
};

/**
 * Format API data for form
 */
export const formatTaskForForm = (
  apiData: Task
): OneOffTaskFormData | RecurringTaskFormData => {
  const commonFields = {
    id: apiData.id,
    content: apiData.content,
    duration: apiData.duration,
    task_type: apiData.task_type,
  };

  if (apiData.task_type === "one-off") {
    const oneOffTask = apiData as OneOffTask;
    return {
      ...commonFields,
      task_type: "one-off" as const,
      dependencies: oneOffTask.dependencies || [],
      due_by: new Date(oneOffTask.due_by),
      is_completed: oneOffTask.is_completed || false,
    };
  } else {
    // Recurring task
    const recurringTask = apiData as RecurringTask;
    const { time_window } = recurringTask;

    return {
      ...commonFields,
      task_type: "recurring" as const,
      recurrence: recurringTask.recurrence,
      time_window: {
        start: time_window?.start || "",
        end: time_window?.end || "",
      },
      is_active: recurringTask.is_active || true,
    };
  }
};

/**
 * Check if a task is blocked by incomplete dependencies
 */
export const isTaskBlocked = (task: Task, allTasks: Task[]): boolean => {
  if (
    task.task_type !== "one-off" ||
    !task.dependencies ||
    task.dependencies.length === 0
  ) {
    return false;
  }

  return task.dependencies.some((depId) => {
    const dependencyTask = allTasks.find((t) => t.id === depId);
    return dependencyTask && !dependencyTask.is_completed;
  });
};

/**
 * Get task status label
 */
export const getTaskStatus = (
  task: Task,
  allTasks: Task[]
): {
  label: string;
  color: string;
} => {
  if (task.is_completed) {
    return { label: "Completed", color: "bg-green-400" };
  }

  if (task.task_type === "one-off") {
    if (isTaskBlocked(task, allTasks)) {
      return { label: "Blocked", color: "bg-amber-400" };
    }

    const dueDate = new Date(task.due_by);
    const today = new Date();

    if (dueDate < today) {
      return { label: "Overdue", color: "bg-red-400" };
    }
  }

  if (task.task_type === "recurring") {
    return { label: "Recurring", color: "bg-primary-light" };
  }

  return { label: "Active", color: "bg-secondary" };
};

/**
 * Format duration in minutes to human-readable string
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

/**
 * Format due date or recurrence pattern to human-readable string
 */
export const formatTaskSchedule = (task: Task): string => {
  if (task.task_type === "one-off") {
    return new Date(task.due_by).toLocaleDateString();
  } else {
    const { recurrence } = task;

    if (recurrence.type === "daily") {
      return "Daily";
    } else if (recurrence.type === "weekly") {
      return "Weekly";
    } else if (recurrence.type === "custom" && recurrence.days) {
      const dayMap: Record<string, string> = {
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday",
        sun: "Sunday",
      };

      return recurrence.days.map((day) => dayMap[day] || day).join(", ");
    }

    return "Custom schedule";
  }
};

/**
 * Check for circular dependencies
 * Returns true if adding the dependency would create a circular reference
 */
export const wouldCreateCircularDependency = (
  taskId: string,
  dependencyId: string,
  allTasks: Task[]
): boolean => {
  // If we're trying to make a task depend on itself, that's circular
  if (taskId === dependencyId) return true;

  // Find the dependency task
  const dependencyTask = allTasks.find((t) => t.id === dependencyId);

  // If dependency doesn't exist or isn't a one-off task, no circular dependency
  if (!dependencyTask || dependencyTask.task_type !== "one-off") return false;

  // If the dependency has no dependencies of its own, no circular dependency
  if (
    !dependencyTask.dependencies ||
    dependencyTask.dependencies.length === 0
  ) {
    return false;
  }

  // Check if any of the dependency's dependencies would create a circular reference
  return checkForCircularPath(
    taskId,
    dependencyTask.dependencies,
    allTasks,
    new Set()
  );
};

/**
 * Helper function to check for circular paths in dependencies
 */
const checkForCircularPath = (
  originalTaskId: string,
  dependencies: string[],
  allTasks: Task[],
  visited: Set<string>
): boolean => {
  for (const depId of dependencies) {
    // If we've seen this task before in this path, we have a cycle
    if (visited.has(depId)) continue;

    // If the dependency is the original task, we have a cycle
    if (depId === originalTaskId) return true;

    // Find this dependency
    const depTask = allTasks.find((t) => t.id === depId);
    if (!depTask || depTask.task_type !== "one-off") continue;

    // If this dependency has its own dependencies, check those too
    if (depTask.dependencies && depTask.dependencies.length > 0) {
      const newVisited = new Set(visited);
      newVisited.add(depId);
      if (
        checkForCircularPath(
          originalTaskId,
          depTask.dependencies,
          allTasks,
          newVisited
        )
      ) {
        return true;
      }
    }
  }

  return false;
};

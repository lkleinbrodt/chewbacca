import type {
  OneOffTaskFormData,
  RecurringTaskFormData,
  Task,
  TaskCreationResponse,
  TaskFilters,
} from "@/types/task";
import { useCallback, useEffect, useState } from "react";

import type { ApiErrorResponse } from "@/utils/errorUtils";
import { handleApiError } from "@/utils/errorUtils";
import taskService from "@/services/taskService";

/**
 * Custom hook for managing tasks
 * Provides state and operations for tasks with loading and error handling
 */
export function useTasks(initialFilters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiErrorResponse | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  /**
   * Fetch tasks based on current filters
   */
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getTasks(filters);
      setTasks(data);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError);
      console.error("Error fetching tasks:", apiError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch tasks when component mounts or filters change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * Create a new task
   */
  const createTask = async (
    taskData: OneOffTaskFormData | RecurringTaskFormData
  ): Promise<TaskCreationResponse> => {
    try {
      const result = await taskService.createTask(taskData);
      fetchTasks(); // Refresh task list
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError);
      throw apiError;
    }
  };

  /**
   * Update an existing task
   */
  const updateTask = async (
    taskId: string,
    taskData: OneOffTaskFormData | RecurringTaskFormData
  ): Promise<{ message: string }> => {
    try {
      const result = await taskService.updateTask(taskId, taskData);
      fetchTasks(); // Refresh task list
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError);
      throw apiError;
    }
  };

  /**
   * Delete a task
   */
  const deleteTask = async (taskId: string): Promise<{ message: string }> => {
    try {
      const result = await taskService.deleteTask(taskId);
      fetchTasks(); // Refresh task list
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError);
      throw apiError;
    }
  };

  /**
   * Mark a task as complete
   */
  const completeTask = async (taskId: string): Promise<{ message: string }> => {
    try {
      const result = await taskService.completeTask(taskId);
      fetchTasks(); // Refresh task list
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError);
      throw apiError;
    }
  };

  /**
   * Clear current error
   */
  const clearError = () => setError(null);

  return {
    tasks,
    loading,
    error,
    clearError,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    refreshTasks: fetchTasks,
  };
}

import type {
  OneOffTaskFormData,
  RecurringTaskFormData,
  Task,
  TaskCreationResponse,
  TaskFilters,
} from "@/types/task";

import axiosInstance from "@/utils/axiosInstance";
import { formatTaskForApi } from "@/utils/taskUtils";

/**
 * Task service for API interactions
 */
const taskService = {
  /**
   * Get all tasks with optional filtering
   */
  getTasks: async (filters: TaskFilters = {}): Promise<Task[]> => {
    try {
      const response = await axiosInstance.get("/tasks", { params: filters });
      return response.data;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  },

  /**
   * Get a single task by ID
   */
  getTask: async (taskId: string): Promise<Task> => {
    const response = await axiosInstance.get(`/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  createTask: async (
    taskData: OneOffTaskFormData | RecurringTaskFormData
  ): Promise<TaskCreationResponse> => {
    const formattedData = formatTaskForApi(taskData);
    const response = await axiosInstance.post("/tasks", formattedData);
    return response.data;
  },

  /**
   * Update an existing task
   */
  updateTask: async (
    taskId: string,
    taskData: OneOffTaskFormData | RecurringTaskFormData
  ): Promise<{ message: string }> => {
    const formattedData = formatTaskForApi(taskData);
    const response = await axiosInstance.put(`/tasks/${taskId}`, formattedData);
    return response.data;
  },

  /**
   * Delete a task
   */
  deleteTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Mark a task as complete
   */
  completeTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/tasks/${taskId}/complete`);
    return response.data;
  },
};

export default taskService;

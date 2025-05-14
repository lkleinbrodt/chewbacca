import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  OneOffTaskFormData,
  RecurringTaskFormData,
  Task,
  TaskFilters,
} from "@/types/task";
import { Plus, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import TaskForm from "@/components/tasks/TaskForm";
import TaskList from "@/components/tasks/TaskList";
import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";

const TaskListPage = () => {
  const [activeTab, setActiveTab] = useState<string>("one-off");
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const { toast } = useToast();

  // Create filters based on active tab
  const getFilters = (tab: string): TaskFilters => {
    switch (tab) {
      case "one-off":
        return { type: "one-off", is_completed: false };
      case "recurring":
        return { type: "recurring" };
      case "completed":
        return { is_completed: true };
      default:
        return {};
    }
  };

  // Use the tasks hook with initial filters
  const {
    tasks,
    loading,
    error,
    clearError,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useTasks(getFilters(activeTab));

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilters(getFilters(tab));
  };

  // Handle task form submission
  const handleTaskFormSubmit = async (
    data: OneOffTaskFormData | RecurringTaskFormData
  ) => {
    try {
      if (selectedTask) {
        await updateTask(selectedTask.id, data);
        toast({
          title: "Task updated",
          description: "The task has been updated successfully.",
        });
      } else {
        await createTask(data);
        toast({
          title: "Task created",
          description: "The new task has been created successfully.",
        });
      }
      return Promise.resolve();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred. Please try again.";

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      return Promise.reject(error);
    }
  };

  // Handle form close
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedTask(undefined);
  };

  // Handle editing task
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(taskId);
        toast({
          title: "Task deleted",
          description: "The task has been deleted successfully.",
        });
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      toast({
        title: "Task completed",
        description: "The task has been marked as complete.",
      });
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={handleCreateTask}>
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message}
            <Button
              variant="link"
              onClick={clearError}
              className="p-0 ml-2 h-auto font-normal text-sm underline"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tabs
          defaultValue="one-off"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="one-off">One-off Tasks</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Tasks</TabsTrigger>
            <TabsTrigger value="completed">Completed Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="one-off" className="p-6">
            <TaskList
              tasks={tasks}
              loading={loading}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onComplete={handleCompleteTask}
            />
          </TabsContent>

          <TabsContent value="recurring" className="p-6">
            <TaskList
              tasks={tasks}
              loading={loading}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onComplete={handleCompleteTask}
            />
          </TabsContent>

          <TabsContent value="completed" className="p-6">
            <TaskList
              tasks={tasks}
              loading={loading}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onComplete={handleCompleteTask}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleTaskFormSubmit}
        initialData={selectedTask}
        availableTasks={tasks.filter(
          (task) =>
            task.task_type === "one-off" &&
            !task.is_completed &&
            (!selectedTask || task.id !== selectedTask.id)
        )}
      />
    </div>
  );
};

export default TaskListPage;

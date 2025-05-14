import {
  ArrowUpDown,
  Check,
  MoreHorizontal,
  Pencil,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDuration,
  formatTaskSchedule,
  getTaskStatus,
} from "@/utils/taskUtils";

import { Button } from "@/components/ui/button";
import DependencyVisualizer from "./DependencyVisualizer";
import type { Task } from "@/types/task";
import { useState } from "react";

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

type SortField = "content" | "due_by" | "duration";

const TaskList = ({
  tasks,
  loading,
  onEdit,
  onDelete,
  onComplete,
}: TaskListProps) => {
  const [sortField, setSortField] = useState<SortField>("due_by");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle task selection for dependency navigation
  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    // Scroll to the selected task
    const taskElement = document.getElementById(`task-${taskId}`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the task briefly
      taskElement.classList.add("bg-amber-50");
      setTimeout(() => {
        taskElement.classList.remove("bg-amber-50");
      }, 2000);
    }
  };

  // Sort tasks based on current sort field and direction
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === "due_by") {
      // Handle sorting for one-off tasks with due dates
      if (a.task_type === "one-off" && b.task_type === "one-off") {
        if (!a.due_by) return 1;
        if (!b.due_by) return -1;

        const dateA = new Date(a.due_by);
        const dateB = new Date(b.due_by);

        return sortDirection === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
      // Sort recurring tasks after one-off tasks
      if (a.task_type === "one-off" && b.task_type === "recurring") return -1;
      if (a.task_type === "recurring" && b.task_type === "one-off") return 1;
    }

    if (sortField === "content") {
      return sortDirection === "asc"
        ? a.content.localeCompare(b.content)
        : b.content.localeCompare(a.content);
    }

    if (sortField === "duration") {
      return sortDirection === "asc"
        ? a.duration - b.duration
        : b.duration - a.duration;
    }

    return 0;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No tasks found. Create a new task to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" onClick={() => handleSort("content")}>
              Task <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => handleSort("due_by")}>
              Due Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => handleSort("duration")}>
              Duration <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>Dependencies</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedTasks.map((task) => {
          const status = getTaskStatus(task, tasks);

          return (
            <TableRow
              key={task.id}
              id={`task-${task.id}`}
              className={`transition-colors duration-300 ${
                task.is_completed ? "bg-gray-50" : ""
              } ${task.id === selectedTaskId ? "bg-amber-50" : ""}`}
            >
              <TableCell className="font-medium">
                <div className="flex items-center">
                  <div
                    className={`h-3 w-3 rounded-full mr-2 ${status.color}`}
                  />
                  <div>
                    {task.content}
                    <div className="text-sm text-gray-500">
                      {task.task_type === "one-off"
                        ? "One-off task"
                        : "Recurring task"}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{formatTaskSchedule(task)}</TableCell>
              <TableCell>{formatDuration(task.duration)}</TableCell>
              <TableCell>
                {task.task_type === "one-off" &&
                task.dependencies &&
                task.dependencies.length > 0 ? (
                  <DependencyVisualizer
                    task={task}
                    allTasks={tasks}
                    onTaskClick={handleTaskClick}
                  />
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!task.is_completed && (
                      <DropdownMenuItem onClick={() => onComplete(task.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        <span>Complete</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(task.id)}>
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TaskList;

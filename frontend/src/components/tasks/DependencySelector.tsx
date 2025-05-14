import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import type { OneOffTask, Task } from "@/types/task";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { wouldCreateCircularDependency } from "@/utils/taskUtils";

interface DependencySelectorProps {
  selectedDependencies: string[];
  onChange: (dependencies: string[]) => void;
  availableTasks: Task[];
  currentTaskId?: string; // To avoid circular dependencies
}

const DependencySelector = ({
  selectedDependencies,
  onChange,
  availableTasks,
  currentTaskId,
}: DependencySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter out completed tasks, the current task, and already selected tasks
  const filteredTasks = availableTasks.filter((task) => {
    // Only one-off tasks can be dependencies
    if (task.task_type !== "one-off") return false;

    // Don't include the current task
    if (currentTaskId && task.id === currentTaskId) return false;

    // Don't include completed tasks
    if (task.is_completed) return false;

    // Don't show already selected dependencies in the dropdown
    if (selectedDependencies.includes(task.id)) return false;

    return true;
  }) as OneOffTask[]; // Safe to cast since we filtered to only one-off tasks

  // Get the task objects for the selected dependencies
  const selectedTasks = availableTasks.filter(
    (task) =>
      selectedDependencies.includes(task.id) && task.task_type === "one-off"
  ) as OneOffTask[]; // Safe to cast since we filtered to only one-off tasks

  const handleSelect = (taskId: string) => {
    // Check for circular dependencies
    if (
      currentTaskId &&
      wouldCreateCircularDependency(currentTaskId, taskId, availableTasks)
    ) {
      setValidationError(
        "Cannot add this dependency as it would create a circular reference"
      );
      return;
    }

    // Add the task to the selected dependencies
    onChange([...selectedDependencies, taskId]);
    setValidationError(null);
    setOpen(false);
  };

  const handleRemove = (taskId: string) => {
    // Remove the task from the selected dependencies
    onChange(selectedDependencies.filter((id) => id !== taskId));
    setValidationError(null);
  };

  return (
    <div className="space-y-2">
      {validationError && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {selectedTasks.length > 0 ? (
          selectedTasks.map((task) => (
            <Badge key={task.id} variant="secondary" className="mr-1 mb-1">
              {task.content}
              <button
                type="button"
                onClick={() => handleRemove(task.id)}
                className="ml-1 rounded-full outline-none focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <div className="text-sm text-gray-500">No dependencies selected</div>
        )}
      </div>

      <Popover
        open={open}
        onOpenChange={(newOpen: boolean) => {
          setOpen(newOpen);
          if (!newOpen) setValidationError(null);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Add dependencies
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search tasks..." />
            <CommandEmpty>No tasks found.</CommandEmpty>
            <CommandGroup>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.id}
                    onSelect={() => handleSelect(task.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedDependencies.includes(task.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{task.content}</span>
                      <span className="text-xs text-gray-500">
                        Due: {new Date(task.due_by).toLocaleDateString()}
                      </span>
                    </div>
                  </CommandItem>
                ))
              ) : (
                <div className="py-6 text-center text-sm">
                  No available tasks to add as dependencies
                </div>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DependencySelector;

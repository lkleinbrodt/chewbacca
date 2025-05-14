import { AlertTriangle, Check, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";
import type { Task } from "@/types/task";

interface DependencyVisualizerProps {
  task: Task;
  allTasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

const DependencyVisualizer = ({
  task,
  allTasks,
  onTaskClick,
}: DependencyVisualizerProps) => {
  // Only one-off tasks can have dependencies
  if (
    task.task_type !== "one-off" ||
    !task.dependencies ||
    task.dependencies.length === 0
  ) {
    return null;
  }

  // Find the dependent tasks from the allTasks array
  const dependentTasks = task.dependencies
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter((t): t is Task => !!t);

  // Check if any dependencies are incomplete (blocking this task)
  const hasBlockingDependencies = dependentTasks.some((t) => !t.is_completed);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {hasBlockingDependencies ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center text-amber-500">
                  <Lock className="h-4 w-4 mr-1" />
                  <span className="text-xs">Blocked</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>This task is blocked by incomplete dependencies</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center text-green-500">
                  <Check className="h-4 w-4 mr-1" />
                  <span className="text-xs">Ready</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>All dependencies are complete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {dependentTasks.map((depTask) => (
          <Badge
            key={depTask.id}
            variant={depTask.is_completed ? "outline" : "secondary"}
            className={`cursor-pointer ${
              depTask.is_completed ? "opacity-60" : ""
            }`}
            onClick={() => onTaskClick && onTaskClick(depTask.id)}
          >
            {!depTask.is_completed && (
              <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
            )}
            {depTask.content.length > 20
              ? `${depTask.content.substring(0, 20)}...`
              : depTask.content}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default DependencyVisualizer;

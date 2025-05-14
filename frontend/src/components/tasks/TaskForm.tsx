import "react-datepicker/dist/react-datepicker.css";

import * as Yup from "yup";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  OneOffTaskFormData,
  RecurringTaskFormData,
  Task,
} from "@/types/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DatePicker from "react-datepicker";
import DependencySelector from "./DependencySelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormik } from "formik";
import { useState } from "react";

// Validation schemas
const oneOffTaskSchema = Yup.object({
  content: Yup.string()
    .required("Task content is required")
    .min(3, "Task description must be at least 3 characters")
    .max(200, "Task description cannot exceed 200 characters"),
  duration: Yup.number()
    .required("Duration is required")
    .positive("Duration must be positive")
    .max(1440, "Task duration cannot exceed 24 hours (1440 minutes)"),
  due_by: Yup.date()
    .required("Due date is required")
    .min(
      new Date(new Date().setHours(0, 0, 0, 0)),
      "Due date cannot be in the past"
    ),
  dependencies: Yup.array().of(Yup.string()),
  is_completed: Yup.boolean(),
});

const recurringTaskSchema = Yup.object({
  content: Yup.string()
    .required("Task content is required")
    .min(3, "Task description must be at least 3 characters")
    .max(200, "Task description cannot exceed 200 characters"),
  duration: Yup.number()
    .required("Duration is required")
    .positive("Duration must be positive")
    .max(1440, "Task duration cannot exceed 24 hours (1440 minutes)"),
  recurrence: Yup.object({
    type: Yup.string()
      .oneOf(["daily", "weekly", "custom"])
      .required("Recurrence type is required"),
    days: Yup.array().when("type", {
      is: (value: string) => value === "custom" || value === "weekly",
      then: (schema) =>
        schema
          .min(1, "Select at least one day")
          .required("At least one day is required"),
      otherwise: (schema) => schema.notRequired(),
    }),
  }).required("Recurrence pattern is required"),
  time_window: Yup.object({
    start: Yup.string().nullable(),
    end: Yup.string()
      .nullable()
      .when("start", {
        is: (value: string) => value && value.length > 0,
        then: (schema) =>
          schema.required("End time is required when start time is specified"),
        otherwise: (schema) => schema.nullable(),
      }),
  }).test(
    "time-window-valid-range",
    "End time must be after start time",
    function (value) {
      if (value.start && value.end) {
        const [startHours, startMinutes] = value.start.split(":").map(Number);
        const [endHours, endMinutes] = value.end.split(":").map(Number);

        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;

        return endTotalMinutes > startTotalMinutes;
      }
      return true;
    }
  ),
  is_active: Yup.boolean(),
});

// Days of the week for selection
const weekDays = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OneOffTaskFormData | RecurringTaskFormData) => Promise<void>;
  initialData?: Task;
  availableTasks: Task[];
}

const TaskForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
  availableTasks,
}: TaskFormProps) => {
  const [taskType, setTaskType] = useState<"one-off" | "recurring">(
    initialData?.task_type || "one-off"
  );

  // Initial values for one-off tasks
  const initialOneOffValues: OneOffTaskFormData = {
    content: initialData?.content || "",
    duration: initialData?.duration || 30,
    task_type: "one-off",
    due_by:
      initialData?.task_type === "one-off"
        ? new Date(initialData.due_by)
        : new Date(),
    dependencies:
      initialData?.task_type === "one-off" ? initialData.dependencies : [],
    is_completed: initialData?.is_completed || false,
  };

  // Initial values for recurring tasks
  const initialRecurringValues: RecurringTaskFormData = {
    content: initialData?.content || "",
    duration: initialData?.duration || 30,
    task_type: "recurring",
    recurrence:
      initialData?.task_type === "recurring"
        ? initialData.recurrence
        : { type: "daily" },
    time_window:
      initialData?.task_type === "recurring"
        ? {
            start: initialData.time_window.start || "",
            end: initialData.time_window.end || "",
          }
        : { start: "", end: "" },
    is_active:
      initialData?.task_type === "recurring" ? initialData.is_active : true,
  };

  // One-off task form
  const oneOffFormik = useFormik({
    initialValues: initialOneOffValues,
    validationSchema: oneOffTaskSchema,
    onSubmit: async (values) => {
      try {
        await onSubmit(values);
        // Reset form to initial values
        oneOffFormik.resetForm({
          values: {
            content: "",
            duration: 30,
            task_type: "one-off",
            due_by: new Date(),
            dependencies: [],
            is_completed: false,
          },
        });
        onClose();
      } catch (error) {
        // Handle submission error
        console.error("Error submitting form:", error);
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Recurring task form
  const recurringFormik = useFormik({
    initialValues: initialRecurringValues,
    validationSchema: recurringTaskSchema,
    onSubmit: async (values) => {
      try {
        await onSubmit(values);
        // Reset form to initial values
        recurringFormik.resetForm({
          values: {
            content: "",
            duration: 30,
            task_type: "recurring",
            recurrence: { type: "daily" },
            time_window: { start: "", end: "" },
            is_active: true,
          },
        });
        onClose();
      } catch (error) {
        // Handle submission error
        console.error("Error submitting form:", error);
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Helper for duration formatting
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours, minutes: mins };
  };

  // Convert hours and minutes to total minutes
  const calculateTotalMinutes = (hours: number, minutes: number) => {
    return hours * 60 + minutes;
  };

  // Handle duration changes for one-off tasks
  const handleOneOffDurationChange = (hours: string, minutes: string) => {
    const totalMinutes = calculateTotalMinutes(
      parseInt(hours) || 0,
      parseInt(minutes) || 0
    );
    oneOffFormik.setFieldValue("duration", totalMinutes);
  };

  // Handle duration changes for recurring tasks
  const handleRecurringDurationChange = (hours: string, minutes: string) => {
    const totalMinutes = calculateTotalMinutes(
      parseInt(hours) || 0,
      parseInt(minutes) || 0
    );
    recurringFormik.setFieldValue("duration", totalMinutes);
  };

  const oneOffDuration = formatDuration(oneOffFormik.values.duration);
  const recurringDuration = formatDuration(recurringFormik.values.duration);

  // Helper function to safely access nested Formik error properties
  const getNestedErrorMessage = (
    errors: Record<string, unknown>,
    path: string[]
  ): string | undefined => {
    let current: unknown = errors;

    for (const key of path) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return typeof current === "string" ? current : undefined;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update task details below"
              : "Add a new task to your list"}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue={taskType}
          onValueChange={(value) =>
            setTaskType(value as "one-off" | "recurring")
          }
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="one-off">One-off Task</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Task</TabsTrigger>
          </TabsList>

          {/* One-off Task Form */}
          <TabsContent value="one-off">
            <form onSubmit={oneOffFormik.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Task Description</Label>
                <Input
                  id="content"
                  name="content"
                  placeholder="What needs to be done?"
                  onChange={oneOffFormik.handleChange}
                  onBlur={oneOffFormik.handleBlur}
                  value={oneOffFormik.values.content}
                  className={
                    oneOffFormik.touched.content && oneOffFormik.errors.content
                      ? "border-red-500"
                      : ""
                  }
                />
                {oneOffFormik.touched.content &&
                  oneOffFormik.errors.content && (
                    <p className="text-sm text-red-500">
                      {oneOffFormik.errors.content}
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_by">Due Date</Label>
                  <DatePicker
                    selected={oneOffFormik.values.due_by}
                    onChange={(date) =>
                      oneOffFormik.setFieldValue("due_by", date)
                    }
                    className={`w-full rounded-md border ${
                      oneOffFormik.touched.due_by && oneOffFormik.errors.due_by
                        ? "border-red-500"
                        : "border-input"
                    } bg-transparent px-3 py-2`}
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select due date"
                    minDate={new Date()}
                  />
                  {oneOffFormik.touched.due_by &&
                    oneOffFormik.errors.due_by && (
                      <p className="text-sm text-red-500">
                        {String(oneOffFormik.errors.due_by)}
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Hours"
                      min="0"
                      value={oneOffDuration.hours}
                      onChange={(e) =>
                        handleOneOffDurationChange(
                          e.target.value,
                          oneOffDuration.minutes.toString()
                        )
                      }
                      className={`flex-1 ${
                        oneOffFormik.touched.duration &&
                        oneOffFormik.errors.duration
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    <Input
                      type="number"
                      placeholder="Minutes"
                      min="0"
                      max="59"
                      value={oneOffDuration.minutes}
                      onChange={(e) =>
                        handleOneOffDurationChange(
                          oneOffDuration.hours.toString(),
                          e.target.value
                        )
                      }
                      className={`flex-1 ${
                        oneOffFormik.touched.duration &&
                        oneOffFormik.errors.duration
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                  </div>
                  {oneOffFormik.touched.duration &&
                    oneOffFormik.errors.duration && (
                      <p className="text-sm text-red-500">
                        {String(oneOffFormik.errors.duration)}
                      </p>
                    )}
                </div>
              </div>

              {/* Dependencies selector for one-off tasks */}
              <div className="space-y-2">
                <Label htmlFor="dependencies">Dependencies</Label>
                <DependencySelector
                  selectedDependencies={oneOffFormik.values.dependencies || []}
                  onChange={(deps) =>
                    oneOffFormik.setFieldValue("dependencies", deps)
                  }
                  availableTasks={availableTasks}
                  currentTaskId={initialData?.id}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={oneOffFormik.isSubmitting}>
                  {initialData ? "Update Task" : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Recurring Task Form */}
          <TabsContent value="recurring">
            <form onSubmit={recurringFormik.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recurring-content">Task Description</Label>
                <Input
                  id="recurring-content"
                  name="content"
                  placeholder="What needs to be done?"
                  onChange={recurringFormik.handleChange}
                  onBlur={recurringFormik.handleBlur}
                  value={recurringFormik.values.content}
                  className={
                    recurringFormik.touched.content &&
                    recurringFormik.errors.content
                      ? "border-red-500"
                      : ""
                  }
                />
                {recurringFormik.touched.content &&
                  recurringFormik.errors.content && (
                    <p className="text-sm text-red-500">
                      {recurringFormik.errors.content}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Hours"
                    min="0"
                    value={recurringDuration.hours}
                    onChange={(e) =>
                      handleRecurringDurationChange(
                        e.target.value,
                        recurringDuration.minutes.toString()
                      )
                    }
                    className={`flex-1 ${
                      recurringFormik.touched.duration &&
                      recurringFormik.errors.duration
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  <Input
                    type="number"
                    placeholder="Minutes"
                    min="0"
                    max="59"
                    value={recurringDuration.minutes}
                    onChange={(e) =>
                      handleRecurringDurationChange(
                        recurringDuration.hours.toString(),
                        e.target.value
                      )
                    }
                    className={`flex-1 ${
                      recurringFormik.touched.duration &&
                      recurringFormik.errors.duration
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                </div>
                {recurringFormik.touched.duration &&
                  recurringFormik.errors.duration && (
                    <p className="text-sm text-red-500">
                      {String(recurringFormik.errors.duration)}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence-type">Recurrence Pattern</Label>
                <Select
                  value={recurringFormik.values.recurrence.type}
                  onValueChange={(value) =>
                    recurringFormik.setFieldValue("recurrence.type", value)
                  }
                >
                  <SelectTrigger
                    id="recurrence-type"
                    className={
                      recurringFormik.touched.recurrence?.type &&
                      recurringFormik.errors.recurrence?.type
                        ? "border-red-500"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select recurrence pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
                {recurringFormik.touched.recurrence?.type &&
                  recurringFormik.errors.recurrence?.type && (
                    <p className="text-sm text-red-500">
                      {String(recurringFormik.errors.recurrence.type)}
                    </p>
                  )}
              </div>

              {(recurringFormik.values.recurrence.type === "weekly" ||
                recurringFormik.values.recurrence.type === "custom") && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {weekDays.map((day) => (
                      <div
                        key={day.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={recurringFormik.values.recurrence.days?.includes(
                            day.value
                          )}
                          onCheckedChange={(checked: boolean) => {
                            const currentDays =
                              recurringFormik.values.recurrence.days || [];
                            const newDays = checked
                              ? [...currentDays, day.value]
                              : currentDays.filter((d) => d !== day.value);
                            recurringFormik.setFieldValue(
                              "recurrence.days",
                              newDays
                            );
                          }}
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Preferred Time Window (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start-time" className="text-xs">
                      Start Time
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={recurringFormik.values.time_window?.start || ""}
                      onChange={(e) =>
                        recurringFormik.setFieldValue(
                          "time_window.start",
                          e.target.value || ""
                        )
                      }
                      className={
                        getNestedErrorMessage(recurringFormik.errors, [
                          "time_window",
                          "start",
                        ]) && recurringFormik.touched.time_window
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {getNestedErrorMessage(recurringFormik.errors, [
                      "time_window",
                      "start",
                    ]) &&
                      recurringFormik.touched.time_window && (
                        <p className="text-sm text-red-500">
                          {getNestedErrorMessage(recurringFormik.errors, [
                            "time_window",
                            "start",
                          ])}
                        </p>
                      )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-time" className="text-xs">
                      End Time
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={recurringFormik.values.time_window?.end || ""}
                      onChange={(e) =>
                        recurringFormik.setFieldValue(
                          "time_window.end",
                          e.target.value || ""
                        )
                      }
                      className={
                        getNestedErrorMessage(recurringFormik.errors, [
                          "time_window",
                          "end",
                        ]) && recurringFormik.touched.time_window
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {getNestedErrorMessage(recurringFormik.errors, [
                      "time_window",
                      "end",
                    ]) &&
                      recurringFormik.touched.time_window && (
                        <p className="text-sm text-red-500">
                          {getNestedErrorMessage(recurringFormik.errors, [
                            "time_window",
                            "end",
                          ])}
                        </p>
                      )}
                  </div>
                </div>
                {typeof recurringFormik.errors.time_window === "string" &&
                  recurringFormik.touched.time_window && (
                    <p className="text-sm text-red-500 col-span-2 mt-1">
                      {recurringFormik.errors.time_window}
                    </p>
                  )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={recurringFormik.isSubmitting}>
                  {initialData ? "Update Task" : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;

import type { CalendarEvent, EventUpdateData } from "@/types/calendar";

import { format } from "date-fns";

// Check if event is managed by Chewy
export const isChewySentinel = (categories: string[] = []): boolean => {
  return categories.some((category) => category.toLowerCase() === "chewy");
};

// Get styling for event based on its type
export const getEventTypeStyles = (
  event: CalendarEvent
): { backgroundColor: string; borderLeft: string; color: string } => {
  if (event.is_chewy_managed) {
    return {
      backgroundColor: "rgba(99, 102, 241, 0.2)",
      borderLeft: "4px solid #6366F1",
      color: "#4F46E5",
    };
  }

  return {
    backgroundColor: "rgba(248, 113, 113, 0.2)",
    borderLeft: "4px solid #F87171",
    color: "#EF4444",
  };
};

// Format event time for display
export const formatEventTime = (
  start: string,
  end: string
): { startFormatted: string; endFormatted: string; duration: number } => {
  const startTime = new Date(start);
  const endTime = new Date(end);

  return {
    startFormatted: format(startTime, "h:mm a"),
    endFormatted: format(endTime, "h:mm a"),
    duration: (endTime.getTime() - startTime.getTime()) / (1000 * 60), // minutes
  };
};

// Format event data for API update
export const formatEventForApi = (eventData: {
  subject?: string;
  start?: Date;
  end?: Date;
}): EventUpdateData => {
  const formattedData: EventUpdateData = {};

  if (eventData.subject) {
    formattedData.subject = eventData.subject;
  }

  if (eventData.start) {
    formattedData.start = eventData.start.toISOString();
  }

  if (eventData.end) {
    formattedData.end = eventData.end.toISOString();
  }

  return formattedData;
};

import {
  eachDayOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  startOfWeek,
} from "date-fns";

import type { CalendarEvent } from "@/types/calendar";
import { appConfig } from "@/constants/appConfig";

// Format date range for display (e.g., "May 10-14, 2025" for Mon-Fri)
export const formatDateRange = (start: Date, end: Date): string => {
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "MMM d")}-${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
};

// Get array of days for the current week view
export const getWeekDays = (currentDate: Date): Date[] => {
  const { weekStartsOn, weekLength } = appConfig.calendar;

  // Convert weekStartsOn to 0|1|2|3|4|5|6 type that date-fns expects
  const startDay = weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const start = startOfWeek(currentDate, { weekStartsOn: startDay });
  const end = new Date(start);
  end.setDate(start.getDate() + weekLength - 1);

  return eachDayOfInterval({ start, end });
};

// Get events for a specific day
export const getEventsForDay = (
  events: CalendarEvent[] | null | undefined,
  date: Date
): CalendarEvent[] => {
  // If events is null, undefined, or not an array, return empty array
  if (!events || !Array.isArray(events)) {
    return [];
  }

  return events.filter((event) => {
    const eventDate = new Date(event.start);
    return isSameDay(eventDate, date);
  });
};

// Calculate position and height for event display
export const calculateEventPosition = (
  event: CalendarEvent,
  dayStartHour?: number,
  dayEndHour?: number
): { top: string; height: string } => {
  const { start: configStartHour, end: configEndHour } =
    appConfig.calendar.workingHours;

  // Use provided hours or fall back to config values
  const startHour = dayStartHour !== undefined ? dayStartHour : configStartHour;
  const endHour = dayEndHour !== undefined ? dayEndHour : configEndHour;

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const eventStartHour = getHours(startTime) + getMinutes(startTime) / 60;
  const eventEndHour = getHours(endTime) + getMinutes(endTime) / 60;

  const dayHeight = 100 / (endHour - startHour); // percentage height per hour

  // Calculate top position and height as percentage of the view
  // Clamp at the visible range boundaries
  const top = Math.max(0, (eventStartHour - startHour) * dayHeight);

  // Calculate height and ensure minimum visibility
  let height;
  if (eventEndHour <= startHour) {
    // Event ends before visible range - show minimal indicator at top
    height = 1.5;
  } else if (eventStartHour >= endHour) {
    // Event starts after visible range - show minimal indicator at bottom
    height = 1.5;
  } else {
    // Normal case - calculate visible portion
    const visibleEndHour = Math.min(eventEndHour, endHour);
    const visibleStartHour = Math.max(eventStartHour, startHour);
    height = (visibleEndHour - visibleStartHour) * dayHeight;
  }

  return {
    top: `${top}%`,
    height: `${Math.max(height, 1.5)}%`, // Ensure minimum height for visibility
  };
};

// Convert string time to Date object
export const timeStringToDate = (
  timeString: string,
  baseDate: Date
): Date | null => {
  if (!timeString) return null;

  const [hours, minutes] = timeString.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);

  return result;
};

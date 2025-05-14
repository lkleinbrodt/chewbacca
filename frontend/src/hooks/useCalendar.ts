import { addWeeks, startOfWeek, subWeeks } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CalendarEvent } from "@/types/calendar";
import { appConfig } from "@/constants/appConfig";
import calendarService from "@/services/calendarApi";
import { formatEventForApi } from "@/utils/calendarUtils";

export function useCalendar(initialDate = new Date()) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Calculate week range based on current date using useMemo to avoid recreating objects
  const { startDate, endDate } = useMemo(() => {
    const { weekStartsOn, weekLength } = appConfig.calendar;
    // Convert weekStartsOn to 0|1|2|3|4|5|6 type that date-fns expects
    const startDay = weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    const start = startOfWeek(currentDate, { weekStartsOn: startDay });
    const end = new Date(start);
    end.setDate(start.getDate() + weekLength - 1);

    return { startDate: start, endDate: end };
  }, [currentDate]);

  // Fetch events for current week
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await calendarService.getEvents(startDate, endDate);
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Navigate to next week
  const nextWeek = () => {
    setCurrentDate((prev) => addWeeks(prev, 1));
  };

  // Navigate to previous week
  const prevWeek = () => {
    setCurrentDate((prev) => subWeeks(prev, 1));
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Synchronize calendar with JSON files
  const syncCalendar = async () => {
    try {
      setIsSyncing(true);
      await calendarService.syncCalendar();
      await fetchEvents(); // Refresh events after sync
      setLastSyncTime(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to synchronize calendar"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Chewy-managed event
  const updateEvent = async (
    eventId: string,
    eventData: {
      subject?: string;
      start?: Date;
      end?: Date;
    }
  ) => {
    try {
      setLoading(true);
      const formattedData = formatEventForApi(eventData);
      await calendarService.updateEvent(eventId, formattedData);
      await fetchEvents(); // Refresh events after update
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch events when week range changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    currentDate,
    startDate,
    endDate,
    events,
    loading,
    error,
    isSyncing,
    lastSyncTime,
    nextWeek,
    prevWeek,
    goToToday,
    syncCalendar,
    updateEvent,
    refreshEvents: fetchEvents,
  };
}

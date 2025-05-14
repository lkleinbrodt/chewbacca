import type {
  CalendarEvent,
  EventUpdateData,
  SyncResult,
} from "@/types/calendar";

import axiosInstance from "@/utils/axiosInstance";

const API_BASE_URL = "";

const calendarService = {
  // Get calendar events for a date range
  getEvents: async (
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> => {
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/calendar`, {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      throw error;
    }
  },

  // Get all calendar events (without date filtering)
  getAllEvents: async (): Promise<CalendarEvent[]> => {
    try {
      const response = await axiosInstance.get(
        `${API_BASE_URL}/calendar/events`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching all calendar events:", error);
      throw error;
    }
  },

  // Trigger JSON synchronization
  syncCalendar: async (): Promise<SyncResult> => {
    try {
      const response = await axiosInstance.post(
        `${API_BASE_URL}/calendar/sync`
      );
      return response.data;
    } catch (error) {
      console.error("Error syncing calendar:", error);
      throw error;
    }
  },

  // Update a Chewy-managed event
  updateEvent: async (
    eventId: string,
    eventData: EventUpdateData
  ): Promise<{ message: string }> => {
    try {
      const response = await axiosInstance.put(
        `${API_BASE_URL}/calendar/events/${eventId}`,
        eventData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  },
};

export default calendarService;

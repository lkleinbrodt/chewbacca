# Chewy Calendar View Implementation Plan

This document provides a detailed step-by-step guide for implementing the Calendar View components for the Chewy application. The plan focuses on calendar synchronization with local JSON files and creating an interactive calendar UI similar to iCal or Outlook.

## Table of Contents

1. [Calendar Component Structure](#calendar-component-structure)
2. [Calendar Data Management](#calendar-data-management)
3. [JSON Synchronization Implementation](#json-synchronization-implementation)
4. [Calendar UI Implementation](#calendar-ui-implementation)
5. [Event Display & Interaction](#event-display--interaction)
6. [Event Details & Editing](#event-details--editing)
7. [Date Navigation & Controls](#date-navigation--controls)
8. [Utility Functions](#utility-functions)
9. [Testing & Validation](#testing--validation)
10. [Example Component Code](#example-component-code)

## Calendar Component Structure

### ✅ Step 1: Create Calendar Page & Components

Created the following component hierarchy:

```
/src/pages/tasks/
  └── CalendarPage.tsx      # Main container for calendar view

/src/components/calendar/
  ├── CalendarHeader.tsx    # Week navigation, sync button, view options
  ├── WeekView.tsx          # Week view grid container
  ├── DayColumn.tsx         # Single day column in week view
  ├── EventBlock.tsx        # Visual representation of calendar event
  ├── EventDetails.tsx      # Modal for viewing/editing event details
  ├── SyncButton.tsx        # Button to trigger JSON synchronization
  └── TimeGrid.tsx          # Time indicators on left side of calendar
```

### ✅ Step 2: Create Calendar-Specific Hooks

Created custom hooks for calendar data in `/src/hooks/`:

1. `useCalendar.ts`: Manages calendar state, event fetching, and date navigation

## Calendar Data Management

### ✅ Step 3: Create Calendar Service

Implemented the calendar API service in `src/services/calendarApi.ts`:

```typescript
import axios from "axios";
import type {
  CalendarEvent,
  EventUpdateData,
  SyncResult,
} from "@/types/calendar";

const API_BASE_URL = "/api";

const calendarService = {
  // Get calendar events for a date range
  getEvents: async (
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> => {
    const response = await axios.get(`${API_BASE_URL}/calendar`, {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  },

  // Get all calendar events (without date filtering)
  getAllEvents: async (): Promise<CalendarEvent[]> => {
    const response = await axios.get(`${API_BASE_URL}/calendar/events`);
    return response.data;
  },

  // Trigger JSON synchronization
  syncCalendar: async (): Promise<SyncResult> => {
    const response = await axios.post(`${API_BASE_URL}/calendar/sync`);
    return response.data;
  },

  // Update a Chewy-managed event
  updateEvent: async (
    eventId: string,
    eventData: EventUpdateData
  ): Promise<{ message: string }> => {
    const response = await axios.put(
      `${API_BASE_URL}/calendar/events/${eventId}`,
      eventData
    );
    return response.data;
  },
};

export default calendarService;
```

### ✅ Step 4: Create Calendar Hook

Implemented `src/hooks/useCalendar.ts` for managing calendar state:

```typescript
import { useState, useEffect, useCallback } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import calendarService from "@/services/calendarApi";
import type { CalendarEvent } from "@/types/calendar";
import { formatEventForApi } from "@/utils/calendarUtils";

export function useCalendar(initialDate = new Date()) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Calculate week range based on current date
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });

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
```

## JSON Synchronization Implementation

### ✅ Step 5: Create Sync Button Component

Implemented `src/components/calendar/SyncButton.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface SyncButtonProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const SyncButton = ({ onSync, isSyncing, lastSyncTime }: SyncButtonProps) => {
  const handleSync = async () => {
    if (!isSyncing) {
      await onSync();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Calendar"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {lastSyncTime
            ? `Last synced: ${format(lastSyncTime, "MMM d, yyyy h:mm a")}`
            : "Calendar has not been synced yet"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncButton;
```

## Calendar UI Implementation

### ✅ Step 7: Create Calendar Page Layout

Implemented `src/pages/tasks/CalendarPage.tsx`:

```tsx
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useCalendar } from "@/hooks/useCalendar";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import WeekView from "@/components/calendar/WeekView";
import EventDetails from "@/components/calendar/EventDetails";
import type { CalendarEvent } from "@/types/calendar";

const CalendarPage = () => {
  const {
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
  } = useCalendar();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const handleUpdateEvent = async (
    eventId: string,
    eventData: { subject?: string; start?: Date; end?: Date }
  ) => {
    const success = await updateEvent(eventId, eventData);
    if (success) {
      setSelectedEvent(null);
    }
    return success;
  };

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-4">Calendar</h1>

      <CalendarHeader
        startDate={startDate}
        endDate={endDate}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
        onToday={goToToday}
        onSync={syncCalendar}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
      />

      {error && (
        <Alert variant="destructive" className="my-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 bg-white rounded-md border overflow-hidden">
        <WeekView
          startDate={startDate}
          events={events}
          loading={loading}
          onEventClick={handleEventClick}
        />
      </div>

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={handleCloseModal}
          onUpdate={handleUpdateEvent}
        />
      )}
    </div>
  );
};

export default CalendarPage;
```

### ✅ Step 8: Create Calendar Header Component

Implemented `src/components/calendar/CalendarHeader.tsx`.

### ✅ Step 9: Create Week View Component

Implemented `src/components/calendar/WeekView.tsx`.

## Event Display & Interaction

### ✅ Step 10: Create Day Column Component

Implemented `src/components/calendar/DayColumn.tsx`.

### ✅ Step 11: Create Event Block Component

Implemented `src/components/calendar/EventBlock.tsx`.

### ✅ Step 12: Implement Event Positioning Logic

Created utility functions to position events within the calendar grid in `src/utils/dateUtils.ts`.

## Event Details & Editing

### ✅ Step 13: Create Event Details Modal

Implemented `src/components/calendar/EventDetails.tsx`.

### ✅ Step 14: Implement Event Type Differentiation

Created logic to distinguish between work and Chewy events in `src/utils/calendarUtils.ts`.

## Date Navigation & Controls

### ✅ Step 15: Implement Date Utilities

Created helper functions for date manipulation in `src/utils/dateUtils.ts`.

### ✅ Step 16: Create Time Grid Component

Implemented `src/components/calendar/TimeGrid.tsx`.

## Utility Functions

### ✅ Step 17: Create Calendar Event Utilities

Implemented additional utilities for event management in `src/utils/calendarUtils.ts`.

## Testing & Validation

### Step 18: Implement Error Handling

Add error handling for calendar operations:

1. Handle synchronization failures gracefully
2. Show appropriate error messages for API failures
3. Implement retry mechanisms for sync operations
4. Add validation for event editing

### Step 19: Add Loading States

Implement loading indicators:

1. Show loading state during calendar sync
2. Display loading indicator when fetching events
3. Add placeholder content during loading

## Example Component Code

### Step 20: Example Calendar Components

Here's a sample implementation of the `CalendarHeader.jsx` component:

```jsx
// src/components/calendar/CalendarHeader.jsx
import { format } from "date-fns";
import { FaChevronLeft, FaChevronRight, FaSync } from "react-icons/fa";
import { formatDateRange } from "../../utils/dateUtils";

const CalendarHeader = ({
  currentDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSync,
  loading,
}) => {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
      <div className="flex items-center space-x-2">
        <h2 className="text-xl font-semibold">Calendar</h2>
        <span className="mx-2 text-gray-500">|</span>
        <div className="text-lg font-medium">{dateRange}</div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onToday}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Today
        </button>

        <div className="flex space-x-1">
          <button
            onClick={onPrevWeek}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Previous week"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextWeek}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Next week"
          >
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onSync}
          disabled={loading}
          className={`flex items-center px-3 py-1 text-sm rounded ${
            loading
              ? "bg-gray-100 text-gray-400"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          <FaSync className={`w-3 h-3 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Syncing..." : "Sync Calendar"}
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
```

Here's a sample implementation of the `EventBlock.jsx` component:

```jsx
// src/components/calendar/EventBlock.jsx
import {
  isChewySentinel,
  getEventTypeStyles,
  formatEventTime,
} from "../../utils/calendarUtils";

const EventBlock = ({ event, onClick, style }) => {
  const isChewySent = isChewySentinel(event.categories);
  const typeStyles = getEventTypeStyles(event);
  const { startFormatted, endFormatted } = formatEventTime(
    event.start,
    event.end
  );

  return (
    <div
      className="absolute w-full overflow-hidden rounded shadow-sm cursor-pointer px-2 py-1 text-xs"
      style={{
        ...typeStyles,
        ...style,
      }}
      onClick={() => onClick(event)}
    >
      <div className="font-semibold truncate">{event.subject}</div>
      <div className="truncate">
        {startFormatted} - {endFormatted}
        {isChewySent && (
          <span className="ml-1 inline-block px-1 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-800">
            Chewy
          </span>
        )}
      </div>
    </div>
  );
};

export default EventBlock;
```

Here's a sample implementation of the `DayColumn.jsx` component:

```jsx
// src/components/calendar/DayColumn.jsx
import { format } from "date-fns";
import EventBlock from "./EventBlock";
import { calculateEventPosition } from "../../utils/dateUtils";

const DayColumn = ({ date, events, onEventClick }) => {
  // Generate time slots background (1-hour intervals)
  const timeSlots = Array.from({ length: 24 }).map((_, i) => (
    <div key={i} className="h-12 border-t border-gray-200" />
  ));

  // Position events within the day column
  const eventBlocks = events.map((event) => {
    const position = calculateEventPosition(event);

    return (
      <EventBlock
        key={event.id}
        event={event}
        onClick={onEventClick}
        style={position}
      />
    );
  });

  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div className="flex-1 relative min-w-[120px]">
      {/* Day header */}
      <div
        className={`h-12 px-2 border-b text-center ${
          isToday ? "bg-blue-50" : ""
        }`}
      >
        <div className="text-sm font-semibold">{format(date, "EEE")}</div>
        <div className={`text-lg ${isToday ? "text-blue-600 font-bold" : ""}`}>
          {format(date, "d")}
        </div>
      </div>

      {/* Time slots */}
      <div className="relative h-[calc(100%-3rem)]">
        <div className="absolute inset-0">{timeSlots}</div>

        {/* Events */}
        <div className="absolute inset-0">{eventBlocks}</div>
      </div>
    </div>
  );
};

export default DayColumn;
```

And finally, a sample implementation of the `WeekView.jsx` component:

```jsx
// src/components/calendar/WeekView.jsx
import { getWeekDays, getEventsForDay } from "../../utils/dateUtils";
import DayColumn from "./DayColumn";
import TimeGrid from "./TimeGrid";
import Spinner from "../common/Spinner";

const WeekView = ({ startDate, events, loading, onEventClick }) => {
  // Get array of days for the week
  const weekDays = getWeekDays(startDate);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex h-full">
        {/* Time indicators */}
        <TimeGrid />

        {/* Day columns */}
        <div className="flex flex-1">
          {weekDays.map((day) => (
            <DayColumn
              key={day.toString()}
              date={day}
              events={getEventsForDay(events, day)}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
```

This implementation plan provides a comprehensive guide for building the calendar view of the Chewy application, with details on component structure, data management, and user interface design. The calendar view will support synchronization with JSON files, display work and Chewy events in different styles, and allow viewing and editing event details.

The implementation focuses on a week view similar to iCal or Outlook, with proper time indicators, event positioning, and responsive design. The system clearly differentiates between work events (immutable) and Chewy-managed events (editable) through visual cues and interaction controls.

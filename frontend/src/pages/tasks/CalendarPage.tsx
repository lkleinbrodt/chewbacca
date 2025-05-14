import { Alert, AlertDescription } from "@/components/ui/alert";

import type { CalendarEvent } from "@/types/calendar";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import EventDetails from "@/components/calendar/EventDetails";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import WeekView from "@/components/calendar/WeekView";
import { appConfig } from "@/constants/appConfig";
import { useCalendar } from "@/hooks/useCalendar";
import { useState } from "react";

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

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-md border overflow-hidden">
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

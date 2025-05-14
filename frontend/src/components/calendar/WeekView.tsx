import { getEventsForDay, getWeekDays } from "@/utils/dateUtils";

import type { CalendarEvent } from "@/types/calendar";
import DayColumn from "./DayColumn";
import { Skeleton } from "@/components/ui/skeleton";
import TimeGrid from "./TimeGrid";
import { appConfig } from "@/constants/appConfig";

interface WeekViewProps {
  startDate: Date;
  events: CalendarEvent[];
  loading: boolean;
  onEventClick: (event: CalendarEvent) => void;
}

const WeekView = ({
  startDate,
  events,
  loading,
  onEventClick,
}: WeekViewProps) => {
  const { start: configStartHour, end: configEndHour } =
    appConfig.calendar.workingHours;

  // Calculate dynamic start/end hours based on events
  const calculateDisplayHours = () => {
    let displayStartHour = configStartHour;
    let displayEndHour = configEndHour;

    // Check if any events fall outside the working hours
    events.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      const eventStartHour = eventStart.getHours();
      const eventEndHour = Math.ceil(
        eventEnd.getHours() + (eventEnd.getMinutes() > 0 ? 1 : 0)
      );

      // Adjust display range if events fall outside configured hours
      if (eventStartHour < displayStartHour) {
        displayStartHour = eventStartHour;
      }

      if (eventEndHour > displayEndHour) {
        displayEndHour = eventEndHour;
      }
    });

    return { displayStartHour, displayEndHour };
  };

  const { displayStartHour, displayEndHour } = calculateDisplayHours();

  // Get array of days for the week
  const weekDays = getWeekDays(startDate);

  if (loading) {
    return (
      <div className="flex-1 flex">
        <div className="w-16 relative border-r">
          <Skeleton className="h-12 w-full" />
          <div className="space-y-2 pt-2 px-2">
            {Array.from({ length: configEndHour - configStartHour }).map(
              (_, i) => (
                <Skeleton key={i} className="h-8 w-10" />
              )
            )}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-r">
              <Skeleton className="h-12 w-full" />
              <div className="p-2 space-y-2">
                {Array.from({ length: (i % 3) + 1 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto flex">
      {/* Time indicators */}
      <TimeGrid startHour={displayStartHour} endHour={displayEndHour} />

      {/* Day columns */}
      <div className="flex flex-1">
        {weekDays.map((day) => (
          <DayColumn
            key={day.toString()}
            date={day}
            events={getEventsForDay(events, day)}
            onEventClick={onEventClick}
            startHour={displayStartHour}
            endHour={displayEndHour}
          />
        ))}
      </div>
    </div>
  );
};

export default WeekView;

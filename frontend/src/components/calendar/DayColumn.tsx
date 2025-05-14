import { format, isToday } from "date-fns";

import type { CalendarEvent } from "@/types/calendar";
import EventBlock from "./EventBlock";
import { appConfig } from "@/constants/appConfig";
import { calculateEventPosition } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

interface DayColumnProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  startHour?: number;
  endHour?: number;
}

const DayColumn = ({
  date,
  events,
  onEventClick,
  startHour: propStartHour,
  endHour: propEndHour,
}: DayColumnProps) => {
  // Use props if provided, otherwise use config values
  const { start: configStartHour, end: configEndHour } =
    appConfig.calendar.workingHours;
  const workStartHour =
    propStartHour !== undefined ? propStartHour : configStartHour;
  const workEndHour = propEndHour !== undefined ? propEndHour : configEndHour;

  // Generate time slots background (1-hour intervals) only for working hours
  const timeSlots = Array.from({ length: workEndHour - workStartHour }).map(
    (_, i) => {
      const hour = workStartHour + i;
      const isBusinessHour = hour >= configStartHour && hour < configEndHour;
      return (
        <div
          key={hour}
          className={cn(
            "h-12 border-t border-gray-200",
            isBusinessHour ? "bg-gray-50/50" : ""
          )}
        />
      );
    }
  );

  // Position events within the day column
  const eventBlocks = events.map((event) => {
    const position = calculateEventPosition(event, workStartHour, workEndHour);

    return (
      <EventBlock
        key={event.id}
        event={event}
        onClick={onEventClick}
        style={position}
      />
    );
  });

  const dayIsToday = isToday(date);

  return (
    <div className="flex-1 relative min-w-[120px]">
      {/* Day header */}
      <div
        className={cn(
          "h-12 px-2 border-b border-r text-center flex flex-col justify-center",
          dayIsToday ? "bg-blue-50 dark:bg-blue-900/20" : ""
        )}
      >
        <div className="text-sm font-medium">{format(date, "EEE")}</div>
        <div
          className={cn(
            "text-lg",
            dayIsToday ? "text-blue-600 dark:text-blue-400 font-bold" : ""
          )}
        >
          {format(date, "d")}
        </div>
      </div>

      {/* Time slots */}
      <div className="relative h-[calc(100%-3rem)] border-r">
        <div className="absolute inset-0">{timeSlots}</div>

        {/* Current time indicator */}
        {dayIsToday && (
          <div
            className="absolute left-0 right-0 border-t border-red-400 z-10"
            style={{
              top: `${Math.max(
                0,
                Math.min(
                  100,
                  (new Date().getHours() +
                    new Date().getMinutes() / 60 -
                    workStartHour) *
                    (100 / (workEndHour - workStartHour))
                )
              )}%`,
              display:
                new Date().getHours() < workStartHour ||
                new Date().getHours() >= workEndHour
                  ? "none"
                  : "block",
            }}
          >
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-400" />
          </div>
        )}

        {/* Events */}
        <div className="absolute inset-0 px-1">{eventBlocks}</div>
      </div>
    </div>
  );
};

export default DayColumn;

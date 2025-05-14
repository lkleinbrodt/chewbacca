import { formatEventTime, getEventTypeStyles } from "@/utils/calendarUtils";

import type { CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";

interface EventBlockProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  style?: React.CSSProperties;
  className?: string;
}

const EventBlock = ({ event, onClick, style, className }: EventBlockProps) => {
  const typeStyles = getEventTypeStyles(event);
  const { startFormatted, endFormatted } = formatEventTime(
    event.start,
    event.end
  );

  return (
    <div
      className={cn(
        "absolute w-[calc(100%-8px)] overflow-hidden rounded shadow-sm cursor-pointer px-2 py-1 text-xs",
        className
      )}
      style={{
        ...typeStyles,
        ...style,
      }}
      onClick={() => onClick(event)}
    >
      <div className="font-semibold truncate">{event.subject}</div>
      <div className="truncate">
        {startFormatted} - {endFormatted}
        {event.is_chewy_managed && (
          <span className="ml-1 inline-block px-1 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-800">
            Chewy
          </span>
        )}
      </div>
    </div>
  );
};

export default EventBlock;

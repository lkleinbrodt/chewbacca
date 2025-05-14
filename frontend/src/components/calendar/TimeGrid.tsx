import { appConfig } from "@/constants/appConfig";

interface TimeGridProps {
  startHour?: number;
  endHour?: number;
}

const TimeGrid = ({
  startHour = appConfig.calendar.workingHours.start,
  endHour = appConfig.calendar.workingHours.end,
}: TimeGridProps) => {
  // Generate time slots (1-hour intervals)
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  );

  return (
    <div className="w-16 relative border-r pr-2 text-right">
      {/* Empty slot for header alignment */}
      <div className="h-12 flex items-end justify-end mb-1">
        <span className="text-xs text-muted-foreground mr-1">GMT</span>
      </div>

      {/* Hour labels */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="h-12 flex items-start justify-end"
          style={{ height: "3rem" }}
        >
          <span className="text-xs text-muted-foreground">{hour}:00</span>
        </div>
      ))}
    </div>
  );
};

export default TimeGrid;

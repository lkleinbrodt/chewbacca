import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import SyncButton from "./SyncButton";
import { formatDateRange } from "@/utils/dateUtils";

interface CalendarHeaderProps {
  startDate: Date;
  endDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const CalendarHeader = ({
  startDate,
  endDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSync,
  isSyncing,
  lastSyncTime,
}: CalendarHeaderProps) => {
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <span className="mx-2 text-muted-foreground">|</span>
        <div className="text-lg font-medium text-muted-foreground">
          {dateRange}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button
          onClick={onToday}
          variant="outline"
          size="sm"
          className="px-3 py-1 text-sm"
        >
          Today
        </Button>

        <div className="flex space-x-1">
          <Button
            onClick={onPrevWeek}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={onNextWeek}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <SyncButton
          onSync={onSync}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
        />
      </div>
    </div>
  );
};

export default CalendarHeader;

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/types/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { formatEventTime } from "@/utils/calendarUtils";
import { useState } from "react";

interface EventDetailsProps {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (
    eventId: string,
    eventData: { subject?: string; start?: Date; end?: Date }
  ) => Promise<boolean>;
}

const EventDetails = ({ event, onClose, onUpdate }: EventDetailsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(event.subject);
  const [startDate, setStartDate] = useState(
    format(new Date(event.start), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(
    format(new Date(event.start), "HH:mm")
  );
  const [endDate, setEndDate] = useState(
    format(new Date(event.end), "yyyy-MM-dd")
  );
  const [endTime, setEndTime] = useState(format(new Date(event.end), "HH:mm"));
  const [isSaving, setIsSaving] = useState(false);

  const { startFormatted, endFormatted, duration } = formatEventTime(
    event.start,
    event.end
  );
  const isChewySentinel = event.is_chewy_managed;

  const handleSave = async () => {
    if (!isChewySentinel) return;

    setIsSaving(true);

    // Create date objects from form fields
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    const success = await onUpdate(event.id, {
      subject,
      start,
      end,
    });

    setIsSaving(false);

    if (success) {
      setIsEditing(false);
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Event" : "Event Details"}
          </DialogTitle>
          <DialogDescription>
            {isChewySentinel
              ? "This event is managed by Chewy and can be edited."
              : "This is a work calendar event and cannot be edited."}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Event subject"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <h3 className="text-lg font-medium">{event.subject}</h3>
            <div className="mt-2 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Start:</span> {startFormatted}
              </div>
              <div className="text-sm">
                <span className="font-medium">End:</span> {endFormatted}
              </div>
              <div className="text-sm">
                <span className="font-medium">Duration:</span>{" "}
                {Math.round(duration)} minutes
              </div>
              {event.categories.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Categories:</span>{" "}
                  {event.categories.join(", ")}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {isChewySentinel && (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetails;

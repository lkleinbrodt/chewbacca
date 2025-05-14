export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  is_chewy_managed: boolean;
  categories: string[];
}

export interface EventUpdateData {
  subject?: string;
  start?: string;
  end?: string;
}

export interface SyncResult {
  message: string;
  files_processed: string[];
  events_synced: number;
  events_deleted: number;
}

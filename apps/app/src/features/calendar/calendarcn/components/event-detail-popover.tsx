"use client";

import type { DetailedCalendarEvent, EventPopoverAnchor } from "./week-view-types";

export interface EventDetailPopoverProps {
  event: DetailedCalendarEvent;
  id?: string;
  anchor?: EventPopoverAnchor;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEventChange?: (event: DetailedCalendarEvent) => void;
  onClose?: () => void;
  onExpand?: () => void;
  [key: string]: unknown;
}

/**
 * OpenMinistry delegates event details to its own read-only Sheet / Drawer
 * (`EventPreviewSheet`), so the internal CalendarCN popover stays inert.
 */
export function EventDetailPopover(_props: EventDetailPopoverProps) {
  return null;
}

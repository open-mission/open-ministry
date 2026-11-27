"use client";

import type { QueryClient } from "@tanstack/react-query";

import { getCalendarEventPreviewAction } from "@/app/actions/calendar";
import type { CalendarItem } from "@/lib/calendar";

export const CALENDAR_EVENT_PREVIEW_STALE_TIME = 2 * 60 * 1000;

export function getCalendarEventPreviewQueryKey(eventId: string) {
  return ["calendar", "event-preview", eventId] as const;
}

export function getCalendarPreviewEventId(
  item: CalendarItem | null | undefined,
): string | null {
  if (!item || (item.type !== "event" && item.type !== "assignment")) {
    return null;
  }
  return item.metadata?.eventId ?? null;
}

export function prefetchCalendarEventPreview(
  queryClient: QueryClient,
  item: CalendarItem | null | undefined,
) {
  const eventId = getCalendarPreviewEventId(item);
  if (!eventId) return;

  void queryClient.prefetchQuery({
    queryKey: getCalendarEventPreviewQueryKey(eventId),
    queryFn: () => getCalendarEventPreviewAction(eventId),
    staleTime: CALENDAR_EVENT_PREVIEW_STALE_TIME,
  });
}

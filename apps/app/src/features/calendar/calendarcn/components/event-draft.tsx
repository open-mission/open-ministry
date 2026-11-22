"use client";

import type {
  EventColor,
  EventDraftLayerProps,
  EventDraftPopoverProps,
} from "./week-view-types";

export const EVENT_DRAFT_ANCHOR_ATTRIBUTE = "data-event-draft-anchor";
export const EVENT_DRAFT_ANCHOR_PROPS = { [EVENT_DRAFT_ANCHOR_ATTRIBUTE]: "" };
export const EVENT_DRAFT_SLOT = "event-draft";

export const EVENT_DRAFT_TINT_CLASS: Record<EventColor, string> = {
  red: "bg-event-red-border/25 dark:bg-event-red-border/20",
  orange: "bg-event-orange-border/25 dark:bg-event-orange-border/20",
  yellow: "bg-event-yellow-border/25 dark:bg-event-yellow-border/20",
  green: "bg-event-green-border/25 dark:bg-event-green-border/20",
  blue: "bg-event-blue-border/25 dark:bg-event-blue-border/20",
  purple: "bg-event-purple-border/25 dark:bg-event-purple-border/20",
  gray: "bg-event-gray-border/25 dark:bg-event-gray-border/20",
};

export function TimeGridEventDraft(_props: EventDraftLayerProps) {
  return null;
}

export function AllDayEventDraft(_props: EventDraftLayerProps) {
  return null;
}

export function EventDraftPopover(_props: EventDraftPopoverProps) {
  return null;
}

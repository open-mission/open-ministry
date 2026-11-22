"use server";

import {
  getCalendarDataAction as getCalendarDataActionImpl,
  getCalendarEventPreviewAction as getCalendarEventPreviewActionImpl,
  saveCalendarPreferencesAction as saveCalendarPreferencesActionImpl,
} from "@/features/events/actions/calendar.actions";

export async function getCalendarDataAction() {
  return getCalendarDataActionImpl();
}

export async function getCalendarEventPreviewAction(eventId: string) {
  return getCalendarEventPreviewActionImpl(eventId);
}

export async function saveCalendarPreferencesAction(payload: {
  weekStartsOn: number;
  timezone: string;
}) {
  return saveCalendarPreferencesActionImpl(payload);
}

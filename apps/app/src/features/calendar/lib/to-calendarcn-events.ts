import type { CalendarEvent, EventColor } from "@/features/calendar/calendarcn/components/calendar-types";
import type { CalendarItem } from "@/lib/calendar";

export type OpenMinistryCalendarEvent = CalendarEvent & {
  openMinistryItem: CalendarItem;
};

function mapItemToEventColor(item: CalendarItem): EventColor {
  if (item.type === "assignment" || item.metadata?.isMyAssignment) {
    return "green";
  }
  if (item.type === "unavailability") {
    return "orange";
  }
  if (item.type === "birthday") {
    return "red";
  }
  if (item.metadata?.eventKind === "rehearsal" || item.color === "purple") {
    return "purple";
  }
  return "gray";
}

export function toCalendarCnEvents(
  items: CalendarItem[],
): OpenMinistryCalendarEvent[] {
  return items.map((item) => {
    const start = new Date(item.startsAt);
    const rawEnd = new Date(item.endsAt);
    const end =
      rawEnd.getTime() > start.getTime()
        ? rawEnd
        : new Date(start.getTime() + 60 * 60 * 1000);

    return {
      id: item.id,
      title: item.title,
      start,
      end,
      isAllDay: item.allDay,
      color: mapItemToEventColor(item),
      location: item.location ?? undefined,
      description: item.description ?? undefined,
      openMinistryItem: item,
    };
  });
}

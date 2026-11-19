import type { CalendarItem } from "@/lib/calendar";

export type FeedEventRow = {
  id: string;
  title: string;
  kind: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
};

export type PersonalFeedItemInput = {
  events: FeedEventRow[];
  /** eventId → rótulos "Departamento — Função" só do próprio membro. */
  assignmentsByEventId: Map<string, string[]>;
  appBaseUrl: string;
};

/**
 * Monta os itens do feed pessoal. Função pura: recebe só o que já foi filtrado
 * pelo dono do feed, então não há como vazar a escala de outra pessoa.
 */
export function buildPersonalFeedItems({
  events,
  assignmentsByEventId,
  appBaseUrl,
}: PersonalFeedItemInput): CalendarItem[] {
  const baseUrl = appBaseUrl.replace(/\/+$/, "");

  return events.map((event) => {
    const assignmentLabels = assignmentsByEventId.get(event.id) ?? [];
    const isAssigned = assignmentLabels.length > 0;
    const details: string[] = [];

    if (isAssigned) {
      details.push(`Escala: ${assignmentLabels.join(" · ")}`);
    }
    if (event.description?.trim()) {
      details.push(event.description.trim());
    }
    details.push(`${baseUrl}/dashboard/events/${event.id}`);

    return {
      id: `event-${event.id}`,
      type: isAssigned ? "assignment" : "event",
      title: isAssigned ? `Escala: ${event.title}` : event.title,
      description: details.join("\n"),
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      allDay: false,
      color: isAssigned ? "emerald" : "primary",
      location: event.location,
      href: `/dashboard/events/${event.id}`,
      metadata: { eventId: event.id, eventKind: event.kind, isMyAssignment: isAssigned },
      sequence: Math.floor(event.updatedAt.getTime() / 1000),
      lastModified: event.updatedAt.toISOString(),
      status: "CONFIRMED",
    } satisfies CalendarItem;
  });
}

export function buildFeedCalendarName(personName: string): string {
  const trimmed = personName.trim();
  return trimmed ? `OpenMinistry — ${trimmed}` : "OpenMinistry — Minha agenda";
}

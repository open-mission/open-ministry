import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CalendarAgendaView } from "@/components/calendar/views/calendar-agenda-view";
import type { CalendarItem } from "@/lib/calendar";

const baseItem: CalendarItem = {
  id: "item-1",
  type: "event",
  title: "Ensaio de Louvor",
  startsAt: "2026-11-20T22:00:00.000Z",
  endsAt: "2026-11-20T23:30:00.000Z",
  allDay: false,
  color: "purple",
  href: "/dashboard/events/item-1",
  metadata: { eventKind: "rehearsal" },
};

function renderAgenda(item: CalendarItem) {
  return renderToStaticMarkup(
    createElement(CalendarAgendaView, {
      currentDate: new Date("2026-11-20T12:00:00.000Z"),
      items: [item],
      timeZone: "America/Sao_Paulo",
      onSelectItem: () => undefined,
      onToday: () => undefined,
    }),
  );
}

describe("CalendarAgendaView action label", () => {
  it("uses 'Mais detalhes' for rehearsals", () => {
    const markup = renderAgenda(baseItem);

    expect(markup).toContain("Mais detalhes");
    expect(markup).not.toContain("Ver culto");
  });

  it("uses 'Mais detalhes' for regular calendar events", () => {
    const markup = renderAgenda({
      ...baseItem,
      id: "item-2",
      title: "Culto de Domingo",
      color: "primary",
      metadata: {},
    });

    expect(markup).toContain("Mais detalhes");
    expect(markup).not.toContain("Ver culto");
  });

  it("keeps the specific availability and member labels", () => {
    const availabilityMarkup = renderAgenda({
      ...baseItem,
      id: "item-3",
      type: "unavailability",
      title: "Indisponibilidade da equipe",
      color: "amber",
      metadata: { isMine: false },
    });
    const birthdayMarkup = renderAgenda({
      ...baseItem,
      id: "item-4",
      type: "birthday",
      title: "Aniversário de Ana",
      color: "rose",
      metadata: {},
    });

    expect(availabilityMarkup).toContain("Ver disponibilidade");
    expect(birthdayMarkup).toContain("Ver membro");
  });
});

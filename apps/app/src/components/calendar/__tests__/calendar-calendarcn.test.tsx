import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { isCalendarRoute } from "@/components/app/home-header-slot";
import { toCalendarCnEvents } from "@/features/calendar/lib/to-calendarcn-events";
import type { CalendarEventPreview, CalendarItem } from "@/lib/calendar";

mock.module("server-only", () => ({}));

mock.module("@/app/actions/calendar", () => ({
  getCalendarDataAction: async () => ({
    items: [],
    preferences: { weekStartsOn: 0 as const, timezone: "America/Sao_Paulo" },
    canViewTeamAvailability: true,
  }),
  getCalendarEventPreviewAction: async (): Promise<CalendarEventPreview | null> =>
    null,
  saveCalendarPreferencesAction: async () => ({ ok: true }),
}));

mock.module("@/features/calendar/actions/feed.actions", () => ({
  listCalendarFeedsAction: async () => ({ ok: true, feeds: [] }),
}));

mock.module("@/components/events/create-event-dialog", () => ({
  CreateEventDialog: () => createElement("div", null, "Criar Evento Dialog"),
}));

afterAll(() => {
  mock.restore();
});

const { FullCalendar } = await import("@/components/calendar/full-calendar");
const { CalendarHeader } = await import("@/components/calendar/calendar-header");

const SAMPLE_ITEMS: CalendarItem[] = [
  {
    id: "event-1",
    type: "event",
    title: "Culto de Domingo à Noite",
    subtitle: "Louvor · Violão",
    description: "Chegar 40 minutos antes para passagem de som.",
    startsAt: "2026-11-22T22:00:00.000Z",
    endsAt: "2026-11-23T00:00:00.000Z",
    allDay: false,
    color: "primary",
    location: "Templo Principal",
    href: "/dashboard/events/evt-1",
    metadata: {
      eventId: "evt-1",
      eventKind: "service",
      departmentIds: ["dept-louvor"],
      isMyAssignment: true,
    },
  },
  {
    id: "assignment-event-1",
    type: "assignment",
    title: "Culto de Domingo à Noite",
    subtitle: "Escalado: Violão · Louvor",
    description: "Função: Violão",
    startsAt: "2026-11-22T22:00:00.000Z",
    endsAt: "2026-11-23T00:00:00.000Z",
    allDay: false,
    color: "emerald",
    location: "Templo Principal",
    href: "/dashboard/events/evt-1",
    metadata: {
      eventId: "evt-1",
      departmentId: "dept-louvor",
      departmentIds: ["dept-louvor"],
      departmentName: "Louvor",
      functionName: "Violão",
      isMyAssignment: true,
    },
  },
  {
    id: "unavail-1",
    type: "unavailability",
    title: "Ana Paula (Indisponível)",
    startsAt: "2026-11-22T12:00:00.000Z",
    endsAt: "2026-11-22T23:59:59.000Z",
    allDay: true,
    color: "amber",
    href: "/dashboard/availability",
    metadata: {
      isMine: false,
      departmentIds: ["dept-louvor"],
    },
  },
];

describe("CalendarCN integration", () => {
  it("maps OpenMinistry items to calm CalendarCN event colors", () => {
    const mapped = toCalendarCnEvents(SAMPLE_ITEMS);
    expect(mapped).toHaveLength(3);
    expect(mapped[0]?.color).toBe("green");
    expect(mapped[1]?.color).toBe("green");
    expect(mapped[2]?.color).toBe("orange");
    expect(mapped[1]?.openMinistryItem.metadata?.functionName).toBe("Violão");
  });

  it("renders CalendarHeader with Desktop order (Mês..Ano) and Mobile order (Agenda..Ano)", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarHeader, {
        currentDate: new Date("2026-11-22T15:00:00.000Z"),
        viewMode: "agenda",
        filterType: "all",
        selectedDepartmentId: "all",
        departments: [{ id: "dept-louvor", name: "Louvor" }],
        weekStartsOn: 0,
        timeZone: "America/Sao_Paulo",
        totalCount: 3,
        eventsCount: 1,
        assignmentsCount: 1,
        unavailabilitiesCount: 1,
        birthdaysCount: 0,
        weekAssignmentsCount: 2,
        canViewTeamAvailability: true,
        canCreateEvent: true,
        canCreateRehearsal: true,
        onViewChange: () => {},
        onFilterChange: () => {},
        onDepartmentChange: () => {},
        onPrev: () => {},
        onNext: () => {},
        onToday: () => {},
        onExport: () => {},
      }),
    );

    expect(html).toContain("Sua semana: 2 escalas");
    expect(html).toContain("Filtrar");
    expect(html).toContain("Agenda");
    expect(html).toContain("Semana");
    expect(html).toContain("Mês");
    expect(html).toContain("Dia");
    expect(html).toContain("Ano");

    const filteredHtml = renderToStaticMarkup(
      createElement(CalendarHeader, {
        currentDate: new Date("2026-11-22T15:00:00.000Z"),
        viewMode: "agenda",
        filterType: "assignments",
        selectedDepartmentId: "dept-louvor",
        departments: [{ id: "dept-louvor", name: "Louvor" }],
        weekStartsOn: 0,
        timeZone: "America/Sao_Paulo",
        totalCount: 3,
        eventsCount: 1,
        assignmentsCount: 1,
        unavailabilitiesCount: 1,
        birthdaysCount: 0,
        weekAssignmentsCount: 2,
        canViewTeamAvailability: true,
        canCreateEvent: true,
        canCreateRehearsal: true,
        onViewChange: () => {},
        onFilterChange: () => {},
        onDepartmentChange: () => {},
        onPrev: () => {},
        onNext: () => {},
        onToday: () => {},
        onExport: () => {},
      }),
    );

    expect(filteredHtml).toContain("Minhas escalas");
    expect(filteredHtml).toContain("Louvor");
  });

  it("renders FullCalendar in full-frame borderless surface without hydration crashes", () => {
    const html = renderToStaticMarkup(
      createElement(FullCalendar, {
        initialItems: SAMPLE_ITEMS,
        initialPreferences: {
          weekStartsOn: 0,
          timezone: "America/Sao_Paulo",
        },
        canCreateEvent: true,
        canCreateRehearsal: true,
        canViewTeamAvailability: true,
        departments: [{ id: "dept-louvor", name: "Louvor" }],
      }),
    );

    expect(html).toContain("Filtrar");
    expect(html).toContain("Novo");
    expect(html).not.toContain("overflow-hidden rounded-xl border bg-card shadow-xs");
  });

  it("detects calendar routes for headerless full-frame layout", () => {
    expect(isCalendarRoute("/calendar")).toBe(true);
    expect(isCalendarRoute("/dashboard/calendar")).toBe(true);
    expect(isCalendarRoute("/events")).toBe(false);
    expect(isCalendarRoute("/")).toBe(false);
    expect(isCalendarRoute(null)).toBe(false);
  });
});

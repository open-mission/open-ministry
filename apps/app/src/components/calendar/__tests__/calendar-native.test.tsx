import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { isCalendarRoute } from "@/components/app/home-header-slot";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { CalendarEventPreview } from "@/lib/calendar";

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
  createCalendarFeedAction: async () => ({ ok: false, error: "" }),
  listCalendarFeedsAction: async () => ({ ok: true, feeds: [] }),
  revokeCalendarFeedAction: async () => ({ ok: false, error: "" }),
  rotateCalendarFeedAction: async () => ({ ok: false, error: "" }),
  updateCalendarFeedAction: async () => ({ ok: false, error: "" }),
}));

mock.module("@/components/events/create-event-dialog", () => ({
  CreateEventDialog: () => createElement("div", null, "Criar Evento Dialog"),
}));

afterAll(() => {
  mock.restore();
});

const { CalendarHeader } = await import("@/components/calendar/calendar-header");
const { MobileAgendaView } = await import(
  "@/components/calendar/mobile-agenda-view"
);
const { buildDepartmentSections, DepartmentScheduleCollapsible } = await import(
  "@/components/calendar/event-detail-dialog"
);

describe("Calendar integration", () => {

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

  it("places SidebarTrigger beside the calendar period heading instead of the top bar and avoids bottom height clipping", async () => {
    const headerWithToggle = renderToStaticMarkup(
      createElement(
        SidebarProvider,
        null,
        createElement(CalendarHeader, {
          currentDate: new Date("2026-11-22T15:00:00.000Z"),
          viewMode: "month",
          filterType: "all",
          selectedDepartmentId: "all",
          departments: [],
          weekStartsOn: 0,
          timeZone: "America/Sao_Paulo",
          totalCount: 20,
          eventsCount: 20,
          assignmentsCount: 1,
          unavailabilitiesCount: 0,
          birthdaysCount: 0,
          weekAssignmentsCount: 1,
          showSidebarToggle: true,
          onViewChange: () => {},
          onFilterChange: () => {},
          onDepartmentChange: () => {},
          onPrev: () => {},
          onNext: () => {},
          onToday: () => {},
          onExport: () => {},
        }),
      ),
    );

    const triggerIndex = headerWithToggle.indexOf('data-sidebar="trigger"');
    const headingIndex = headerWithToggle.indexOf("Novembro de 2026");
    expect(triggerIndex).toBeGreaterThan(-1);
    expect(headingIndex).toBeGreaterThan(triggerIndex);

    const [layoutSource, nativeCalendarSource, calendarPageSource] =
      await Promise.all([
        Bun.file(
          new URL("../../../app/(app)/layout.tsx", import.meta.url),
        ).text(),
        Bun.file(
          new URL("../native-calendar.tsx", import.meta.url),
        ).text(),
        Bun.file(
          new URL("../../../app/(app)/calendar/page.tsx", import.meta.url),
        ).text(),
      ]);

    const hiddenSlotStart = layoutSource.indexOf("<CalendarHiddenSlot>");
    const hiddenSlotEnd = layoutSource.indexOf("</CalendarHiddenSlot>");
    const hiddenSlotBody = layoutSource.slice(hiddenSlotStart, hiddenSlotEnd);
    expect(hiddenSlotBody).toContain("<SidebarTrigger");
    expect(calendarPageSource).toContain("empty:hidden");
    expect(nativeCalendarSource).toContain("showSidebarToggle");
    expect(nativeCalendarSource).not.toContain("max-h-[calc(100dvh-14rem)]");
    expect(nativeCalendarSource).not.toContain("max-h-[calc(100dvh-13rem)]");
  });

  it("renders dedicated MobileAgendaView for all 4 wireframe views (Agenda, Semana, Mês, Ano) with header and navigator", async () => {
    const [nativeCalendarSource, actionsSource] = await Promise.all([
      Bun.file(new URL("../native-calendar.tsx", import.meta.url)).text(),
      Bun.file(new URL("../calendar-actions.tsx", import.meta.url)).text(),
    ]);

    expect(nativeCalendarSource).toContain("<MobileAgendaView");
    expect(nativeCalendarSource).toContain('className="flex min-h-0 flex-1 flex-col md:hidden"');
    expect(nativeCalendarSource).toContain('className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-4"');
    expect(actionsSource).toContain('variant === "mobile"');
    expect(actionsSource).toContain("Filtrar compromissos");
    expect(actionsSource).toContain("Ver escalas");

    const sampleItems = [
      {
        id: "evt-1",
        type: "event" as const,
        title: "Culto de gratidão e celebração",
        startsAt: "2026-11-23T12:00:00.000Z",
        endsAt: "2026-11-23T14:00:00.000Z",
        allDay: false,
        color: "primary" as const,
        location: "Templo principal",
        subtitle: "Culto",
      },
    ];

    const baseProps = {
      organizationName: "Igreja Esperança Central",
      currentDate: new Date("2026-11-23T15:00:00.000Z"),
      now: new Date("2026-11-23T15:00:00.000Z"),
      items: sampleItems,
      filterType: "all" as const,
      selectedDepartmentId: "all",
      departments: [{ id: "dept-louvor", name: "Louvor" }],
      weekStartsOn: 1 as const,
      timeZone: "America/Sao_Paulo",
      activeFilterCount: 0,
      filterContent: createElement("div", null, "Filtros"),
      canCreateEvent: true,
      canCreateRehearsal: true,
      canViewSchedules: true,
      onViewChange: () => {},
      onClearFilterType: () => {},
      onClearDepartment: () => {},
      onResetFilters: () => {},
      onPrev: () => {},
      onNext: () => {},
      onToday: () => {},
      onSelectDate: () => {},
      onSelectMonth: () => {},
      onSelectItem: () => {},
      onExport: () => {},
    };

    const agendaHtml = renderToStaticMarkup(
      createElement(MobileAgendaView, { ...baseProps, viewMode: "agenda" }),
    );
    expect(agendaHtml).toContain("Agenda");
    expect(agendaHtml).toContain("Igreja Esperança Central");
    expect(agendaHtml).toContain("Semana");
    expect(agendaHtml).toContain("Mês");
    expect(agendaHtml).toContain("Ano");
    expect(agendaHtml).toContain("Culto de gratidão e celebração");
    expect(agendaHtml).toContain("09:00");
    expect(agendaHtml).toContain("manhã");
    expect(agendaHtml.indexOf('aria-label="Período anterior"')).toBeLessThan(
      agendaHtml.indexOf(">Hoje<"),
    );
    expect(agendaHtml.indexOf(">Hoje<")).toBeLessThan(
      agendaHtml.indexOf('aria-label="Próximo período"'),
    );
    expect(agendaHtml.indexOf('aria-label="Próximo período"')).toBeLessThan(
      agendaHtml.indexOf('aria-label="Mais ações e filtros"'),
    );

    const weekHtml = renderToStaticMarkup(
      createElement(MobileAgendaView, { ...baseProps, viewMode: "week" }),
    );
    expect(weekHtml).toContain('aria-label="Dias da semana"');
    expect(weekHtml).toContain("SEG");
    expect(weekHtml).toContain("DOM");

    const monthHtml = renderToStaticMarkup(
      createElement(MobileAgendaView, { ...baseProps, viewMode: "month" }),
    );
    expect(monthHtml).toContain("Novembro de 2026");
    expect(monthHtml).toContain("Calendário mensal · 23 selecionado");
    expect(monthHtml).toContain("09h00");

    const yearHtml = renderToStaticMarkup(
      createElement(MobileAgendaView, { ...baseProps, viewMode: "year" }),
    );
    expect(yearHtml).toContain("Visão anual · 12 meses");
    expect(yearHtml).toContain("Janeiro");
    expect(yearHtml).toContain("Novembro");
    expect(yearHtml).toContain("1 compromisso");
  });

  it("locks desktop calendar viewport height and scopes vertical scrolling to each section", async () => {
    const [
      layoutSource,
      nativeCalendarSource,
      monthSource,
      weekSource,
      agendaSource,
      yearSource,
    ] = await Promise.all([
      Bun.file(new URL("../../../app/(app)/layout.tsx", import.meta.url)).text(),
      Bun.file(new URL("../native-calendar.tsx", import.meta.url)).text(),
      Bun.file(
        new URL("../views/calendar-month-view.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../views/calendar-week-view.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../views/calendar-agenda-view.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../views/calendar-year-view.tsx", import.meta.url),
      ).text(),
    ]);

    expect(layoutSource).toContain(
      "has-[[data-calendar-active]]:md:h-dvh has-[[data-calendar-active]]:md:overflow-hidden",
    );
    expect(layoutSource).not.toContain("has-[[data-calendar-container]]");
    expect(nativeCalendarSource).toContain(
      "min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto overscroll-contain",
    );
    expect(monthSource).toContain("md:min-h-0 md:flex-1 md:auto-rows-fr");
    expect(weekSource).toContain("md:min-h-0 md:max-h-none md:flex-1");
    expect(agendaSource).toContain(
      "md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain",
    );
    expect(yearSource).toContain(
      "md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain",
    );
  });

  it("navigates MiniCalendar day picks to day on month/year views, stays on week when in week view, and marks current day in month/week/year views", async () => {
    const [
      nativeCalendarSource,
      monthSource,
      weekSource,
      yearSource,
    ] = await Promise.all([
      Bun.file(new URL("../native-calendar.tsx", import.meta.url)).text(),
      Bun.file(
        new URL("../views/calendar-month-view.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../views/calendar-week-view.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../views/calendar-year-view.tsx", import.meta.url),
      ).text(),
    ]);

    expect(nativeCalendarSource).toContain(
      'if (effectiveViewMode === "month" || effectiveViewMode === "year") {\n        setChosenView("day");',
    );
    expect(nativeCalendarSource).toContain("setBrowsedMonth({");
    expect(monthSource).toContain('data-calendar-today={isDayToday ? "true" : undefined}');
    expect(monthSource).toContain("Hoje");
    expect(weekSource).toContain('data-calendar-today={isDayToday ? "true" : undefined}');
    expect(weekSource).toContain("data-calendar-now-line");
    expect(yearSource).toContain("isCurrentRealMonth");
    expect(yearSource).toContain(
      'data-calendar-today={isDayToday && isCurrentMonth ? "true" : undefined}',
    );
  });

  it("detects calendar routes to hide the top page header while keeping notifications", () => {
    expect(isCalendarRoute("/calendar")).toBe(true);
    expect(isCalendarRoute("/dashboard/calendar")).toBe(true);
    expect(isCalendarRoute("/events")).toBe(false);
    expect(isCalendarRoute("/")).toBe(false);
    expect(isCalendarRoute(null)).toBe(false);
  });

  it("serves the native calendar at /calendar, redirects legacy routes, and removes the temporary preview", async () => {
    const [
      calendarPageSource,
      legacyCalendarPageSource,
      previewPageExists,
      dialogSource,
    ] = await Promise.all([
      Bun.file(
        new URL("../../../app/(app)/calendar/page.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../../../app/(app)/dashboard/calendar/page.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL(
          "../../../app/(app)/dashboard/calendar/preview/page.tsx",
          import.meta.url,
        ),
      ).exists(),
      Bun.file(
        new URL("../event-detail-dialog.tsx", import.meta.url),
      ).text(),
    ]);

    expect(calendarPageSource).toContain("data-calendar-container");
    expect(calendarPageSource).toContain("NativeCalendar");
    expect(calendarPageSource).not.toContain("FullCalendar");
    expect(calendarPageSource).not.toContain("CalendarCN");
    expect(calendarPageSource).not.toContain("Prévia temporária");
    expect(calendarPageSource).not.toContain("md:pl-10");
    expect(legacyCalendarPageSource).toContain('redirect("/calendar")');
    expect(previewPageExists).toBe(false);
    expect(dialogSource).not.toContain("Prévia · Modo leitura");
    expect(dialogSource).toContain(
      '<section aria-label="Equipe escalada" className="space-y-3 pt-1">',
    );
  });

  it("uses a half-width desktop sheet and a Drawer on mobile for event details", async () => {
    const source = await Bun.file(
      new URL("../event-detail-dialog.tsx", import.meta.url),
    ).text();

    expect(source).toContain("data-[side=right]:md:!w-1/2 data-[side=right]:md:!max-w-[50vw]");
    expect(source).not.toContain("sm:max-w-md md:max-w-lg");
    expect(source).toContain("<Drawer open={open} onOpenChange={onOpenChange}>");
    expect(source).toContain("rounded-t-xl border-x-0 border-b-0 bg-popover");
  });

  it("gates the Ver escalas button behind the server-provided permission", async () => {
    const [pageSource, panelSource, actionSource, eventsPageSource] =
      await Promise.all([
        Bun.file(
          new URL("../../../app/(app)/calendar/page.tsx", import.meta.url),
        ).text(),
        Bun.file(
          new URL("../schedules-panel.tsx", import.meta.url),
        ).text(),
        Bun.file(
          new URL("../../../app/actions/schedules.ts", import.meta.url),
        ).text(),
        Bun.file(
          new URL(
            "../../../app/(app)/dashboard/events/page.tsx",
            import.meta.url,
          ),
        ).text(),
      ]);

    expect(pageSource).toContain('can("schedules", "read")');
    expect(pageSource).toContain("canViewSchedules={canViewSchedules}");
    expect(panelSource).toContain("if (!canViewSchedules) return null;");
    expect(panelSource).toContain("data-[side=right]:md:!w-1/2 data-[side=right]:md:!max-w-[50vw]");
    expect(panelSource).toContain("rounded-t-xl border-x-0 border-b-0 bg-popover");
    expect(panelSource).toContain("Abrir página completa");
    // A checagem de permissão também acontece na origem dos dados.
    expect(actionSource).toContain('can("schedules", "read")');
    expect(eventsPageSource).toContain('redirect("/calendar")');
  });

  it("splits schedule coverage by department including empty departments", () => {
    const preview: CalendarEventPreview = {
      eventId: "evt-1",
      kind: "service",
      title: "Culto de Domingo",
      startsAt: "2026-11-22T21:00:00.000Z",
      endsAt: "2026-11-22T23:30:00.000Z",
      location: "Templo Principal",
      description: null,
      href: "/dashboard/events/evt-1",
      coverage: { assigned: 2, total: 12 },
      departmentCoverage: [
        { departmentId: "dept-louvor", departmentName: "Louvor", assigned: 2, total: 6 },
        { departmentId: "dept-midia", departmentName: "Mídia", assigned: 0, total: 4 },
        { departmentId: "dept-recepcao", departmentName: "Recepção", assigned: 0, total: 2 },
      ],
      assignments: [
        {
          id: "a1",
          personName: "Maria Clara",
          functionName: "Violão",
          departmentId: "dept-louvor",
          departmentName: "Louvor",
          isMine: true,
        },
        {
          id: "a2",
          personName: "Lucas Mendes",
          functionName: "Bateria",
          departmentId: "dept-louvor",
          departmentName: "Louvor",
          isMine: false,
        },
      ],
      songs: [],
      planItems: [],
    };

    const sections = buildDepartmentSections(preview);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({
      departmentName: "Louvor",
      assigned: 2,
      total: 6,
    });
    expect(sections[0]?.assignments).toHaveLength(2);
    expect(sections[1]).toMatchObject({
      departmentName: "Mídia",
      assigned: 0,
      total: 4,
    });
    expect(sections[1]?.assignments).toHaveLength(0);
    expect(sections[2]).toMatchObject({
      departmentName: "Recepção",
      assigned: 0,
      total: 2,
    });
  });

  it("renders each scheduled department as collapsible with >=44px trigger, collapsed by default when multiple and open when single", async () => {
    const sections = buildDepartmentSections({
      eventId: "evt-2",
      kind: "service",
      title: "Culto",
      startsAt: "2026-11-22T21:00:00.000Z",
      endsAt: "2026-11-22T23:00:00.000Z",
      location: null,
      description: null,
      href: "/dashboard/events/evt-2",
      coverage: { assigned: 2, total: 6 },
      departmentCoverage: [
        { departmentId: "dept-midia", departmentName: "Mídia", assigned: 2, total: 2 },
        { departmentId: "dept-louvor", departmentName: "Grupo de Louvor", assigned: 0, total: 4 },
      ],
      assignments: [
        {
          id: "a1",
          personName: "Claudio Alberto",
          functionName: "Livestream",
          departmentId: "dept-midia",
          departmentName: "Mídia",
          isMine: true,
        },
        {
          id: "a2",
          personName: "Lucas Alves",
          functionName: "Livestream",
          departmentId: "dept-midia",
          departmentName: "Mídia",
          isMine: false,
        },
      ],
      songs: [],
      planItems: [],
    });

    const collapsedHtml = renderToStaticMarkup(
      createElement(DepartmentScheduleCollapsible, {
        section: sections[0]!,
        defaultOpen: false,
      }),
    );
    expect(collapsedHtml).toContain("min-h-11");
    expect(collapsedHtml).toContain("after:hidden");
    expect(collapsedHtml).toContain("flex-1 truncate");
    expect(collapsedHtml).toContain('aria-expanded="false"');
    expect(collapsedHtml).toContain("Mídia");
    expect(collapsedHtml).toContain("Completa (2/2)");
    expect(collapsedHtml.match(/<svg/g) ?? []).toHaveLength(1);
    expect(collapsedHtml).not.toContain("Claudio Alberto");

    const expandedEmptyHtml = renderToStaticMarkup(
      createElement(DepartmentScheduleCollapsible, {
        section: sections[1]!,
        defaultOpen: true,
      }),
    );
    expect(expandedEmptyHtml).toContain('aria-expanded="true"');
    expect(expandedEmptyHtml).toContain("Grupo de Louvor");
    expect(expandedEmptyHtml).toContain("faltam 4");
    expect(expandedEmptyHtml).toContain(
      "Nenhuma pessoa escalada neste departamento.",
    );

    const dialogSource = await Bun.file(
      new URL("../event-detail-dialog.tsx", import.meta.url),
    ).text();
    expect(dialogSource).toContain("defaultOpen={departmentSections.length === 1}");
  });
});

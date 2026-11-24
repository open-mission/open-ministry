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
const { buildDepartmentSections } = await import(
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

  it("organizes mobile CalendarHeader into two rows with < Hoje >, Escalas + Novo, and icon-only filter", async () => {
    const [headerSource, actionsSource] = await Promise.all([
      Bun.file(new URL("../calendar-header.tsx", import.meta.url)).text(),
      Bun.file(new URL("../calendar-actions.tsx", import.meta.url)).text(),
    ]);

    expect(headerSource).toContain("FilterIcon");
    expect(headerSource).not.toContain("SlidersHorizontalIcon");

    const mobileStart = headerSource.indexOf("flex flex-col gap-3 sm:hidden");
    const mobileMarkup = headerSource.slice(mobileStart);
    const navIdx = mobileMarkup.indexOf('aria-label="Navegação do período"');
    const todayIdx = mobileMarkup.indexOf("Hoje");
    const nextIdx = mobileMarkup.indexOf('aria-label="Próximo período"');
    const actionsIdx = mobileMarkup.indexOf("<CalendarActions");
    const tabsIdx = mobileMarkup.indexOf('aria-label="Visualizações da agenda"');
    const filterIdx = mobileMarkup.indexOf('aria-label="Filtrar agenda"');

    expect(navIdx).toBeGreaterThan(-1);
    expect(todayIdx).toBeGreaterThan(navIdx);
    expect(nextIdx).toBeGreaterThan(todayIdx);
    expect(actionsIdx).toBeGreaterThan(nextIdx);
    expect(tabsIdx).toBeGreaterThan(actionsIdx);
    expect(filterIdx).toBeGreaterThan(tabsIdx);
    expect(mobileMarkup).not.toContain("{mobileFilterSummary}");

    expect(actionsSource).toContain('variant === "mobile"');
    const mobileBranchStart = actionsSource.indexOf('variant === "mobile" ? (');
    const mobileBranchEnd = actionsSource.indexOf(") : (", mobileBranchStart);
    const mobileBranch = actionsSource.slice(mobileBranchStart, mobileBranchEnd);
    expect(mobileBranch.indexOf("<SchedulesPanel")).toBeLessThan(
      mobileBranch.indexOf("{actionGroup}"),
    );
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
      "has-[[data-calendar-container]]:md:h-dvh has-[[data-calendar-container]]:md:overflow-hidden",
    );
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
      'if (viewMode === "month" || viewMode === "year") {\n        setChosenView("day");',
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

  it("serves the native calendar at /calendar and redirects legacy routes", async () => {
    const [
      calendarPageSource,
      legacyCalendarPageSource,
      legacyPreviewPageSource,
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
      ).text(),
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
    expect(legacyPreviewPageSource).toContain('redirect("/calendar")');
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
});

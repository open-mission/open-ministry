"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfWeek,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { CalendarHeader } from "@/components/calendar/calendar-header";
import { EventPreviewSheet } from "@/components/calendar/event-detail-dialog";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { AgendaView } from "@/features/calendar/calendarcn/components/agenda-view";
import { CalendarProvider } from "@/features/calendar/calendarcn/components/calendar-provider";
import type {
  EventContentProps,
  NewEventRange,
} from "@/features/calendar/calendarcn/components/calendar-types";
import { MonthView } from "@/features/calendar/calendarcn/components/month-view";
import { TimeGrid } from "@/features/calendar/calendarcn/components/time-grid";
import { YearView } from "@/features/calendar/calendarcn/components/year-view";
import {
  toCalendarCnEvents,
  type OpenMinistryCalendarEvent,
} from "@/features/calendar/lib/to-calendarcn-events";
import {
  AGENDA_WINDOW_DAYS,
  buildCalendarIcs,
  dedupeCalendarItems,
  formatCalendarDate,
  getCalendarRange,
  isCalendarItemInRange,
  type CalendarFilterType,
  type CalendarItem,
  type CalendarPreferences,
  type CalendarViewMode,
} from "@/lib/calendar";
import type { DepartmentOption } from "@/lib/departments";

type FullCalendarProps = {
  initialItems: CalendarItem[];
  initialPreferences: CalendarPreferences;
  canCreateEvent?: boolean;
  canCreateRehearsal?: boolean;
  canViewTeamAvailability?: boolean;
  departments?: DepartmentOption[];
};

const MOBILE_QUERY = "(max-width: 639px)";

function subscribeToMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot() {
  return false;
}

function filterByDepartment(
  items: CalendarItem[],
  selectedDepartmentId: string,
): CalendarItem[] {
  if (selectedDepartmentId === "all") return items;
  return items.filter((item) => {
    if (item.type === "event") {
      return item.metadata?.departmentIds?.includes(selectedDepartmentId);
    }
    if (item.type === "assignment") {
      return (
        item.metadata?.departmentId === selectedDepartmentId ||
        item.metadata?.departmentIds?.includes(selectedDepartmentId)
      );
    }
    if (item.type === "birthday") {
      return item.metadata?.departmentIds?.includes(selectedDepartmentId);
    }
    if (item.type === "unavailability") {
      return (
        item.metadata?.departmentIds?.includes(selectedDepartmentId) ?? false
      );
    }
    return true;
  });
}

function applyTypeFilter(
  items: CalendarItem[],
  filterType: CalendarFilterType,
): CalendarItem[] {
  if (filterType === "events") {
    return items.filter((item) => item.type === "event");
  }
  if (filterType === "assignments") {
    return items.filter((item) => item.type === "assignment");
  }
  if (filterType === "unavailabilities") {
    return items.filter((item) => item.type === "unavailability");
  }
  if (filterType === "birthdays") {
    return items.filter((item) => item.type === "birthday");
  }
  return dedupeCalendarItems(items);
}

export function FullCalendar({
  initialItems,
  initialPreferences,
  canCreateEvent = false,
  canCreateRehearsal = false,
  canViewTeamAvailability = false,
  departments = [],
}: FullCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [chosenView, setChosenView] = useState<CalendarViewMode | null>(null);
  const [filterType, setFilterType] = useState<CalendarFilterType>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const preferences = initialPreferences;

  // Mobile opens on chronological Agenda; desktop opens on Month (Google Calendar style).
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );
  const viewMode = chosenView ?? (isMobile ? "agenda" : "month");

  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [slotCreateOpen, setSlotCreateOpen] = useState(false);
  const [slotCreateDate, setSlotCreateDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  const handleViewChange = useCallback((view: CalendarViewMode) => {
    setChosenView(view);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case "month":
          return subMonths(prev, 1);
        case "week":
          return subWeeks(prev, 1);
        case "day":
          return subDays(prev, 1);
        case "year":
          return subYears(prev, 1);
        case "agenda":
          return subDays(prev, AGENDA_WINDOW_DAYS);
      }
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case "month":
          return addMonths(prev, 1);
        case "week":
          return addWeeks(prev, 1);
        case "day":
          return addDays(prev, 1);
        case "year":
          return addYears(prev, 1);
        case "agenda":
          return addDays(prev, AGENDA_WINDOW_DAYS);
      }
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setChosenView("day");
    setCurrentDate(date);
  }, []);

  const visibleRange = useMemo(
    () => getCalendarRange(viewMode, currentDate, preferences.weekStartsOn),
    [currentDate, preferences.weekStartsOn, viewMode],
  );

  const visibleItems = useMemo(
    () =>
      initialItems.filter((item) =>
        isCalendarItemInRange(item, visibleRange, preferences.timezone),
      ),
    [initialItems, preferences.timezone, visibleRange],
  );

  const departmentVisibleItems = useMemo(
    () => filterByDepartment(visibleItems, selectedDepartmentId),
    [visibleItems, selectedDepartmentId],
  );

  const itemsCount = useMemo(
    () => ({
      total: dedupeCalendarItems(departmentVisibleItems).length,
      events: departmentVisibleItems.filter((i) => i.type === "event").length,
      assignments: departmentVisibleItems.filter((i) => i.type === "assignment")
        .length,
      unavailabilities: departmentVisibleItems.filter(
        (i) => i.type === "unavailability",
      ).length,
      birthdays: departmentVisibleItems.filter((i) => i.type === "birthday")
        .length,
    }),
    [departmentVisibleItems],
  );

  const visibleFilteredItems = useMemo(
    () => applyTypeFilter(departmentVisibleItems, filterType),
    [departmentVisibleItems, filterType],
  );

  // Full range across months/scrolling passed to CalendarProvider so CalendarCN
  // shows neighboring days and scroll buffers accurately.
  const providerItems = useMemo(
    () =>
      applyTypeFilter(
        filterByDepartment(initialItems, selectedDepartmentId),
        filterType,
      ),
    [initialItems, selectedDepartmentId, filterType],
  );

  const calendarcnEvents = useMemo(
    () => toCalendarCnEvents(providerItems),
    [providerItems],
  );

  const itemsById = useMemo(
    () => new Map(providerItems.map((item) => [item.id, item])),
    [providerItems],
  );

  const weekAssignmentsCount = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: preferences.weekStartsOn });
    const end = endOfWeek(now, { weekStartsOn: preferences.weekStartsOn });
    const range = {
      start,
      end,
      startKey: format(start, "yyyy-MM-dd"),
      endKey: format(end, "yyyy-MM-dd"),
    };
    return initialItems.filter(
      (item) =>
        item.type === "assignment" &&
        isCalendarItemInRange(item, range, preferences.timezone),
    ).length;
  }, [initialItems, preferences.timezone, preferences.weekStartsOn]);

  const handleEventSelect = useCallback(
    (eventId: string) => {
      const item = itemsById.get(eventId);
      if (!item) return;
      setSelectedItem(item);
      setIsDetailOpen(true);
    },
    [itemsById],
  );

  const handleSlotCreateEvent = useCallback(
    (range: NewEventRange) => {
      if (!canCreateEvent) return null;
      setSlotCreateDate(format(range.start, "yyyy-MM-dd"));
      setSlotCreateOpen(true);
      return null;
    },
    [canCreateEvent],
  );

  const handleExport = useCallback(() => {
    if (visibleFilteredItems.length === 0) {
      toast.info("Não há compromissos para exportar neste período.");
      return;
    }

    const ics = buildCalendarIcs(visibleFilteredItems, {
      timeZone: preferences.timezone,
      calendarName: "Agenda OpenMinistry",
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agenda-openministry.ics";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Agenda exportada para o seu calendário.");
  }, [visibleFilteredItems, preferences.timezone]);

  const renderEventContent = useCallback(
    ({
      event,
      placement,
      isSelected,
    }: EventContentProps<OpenMinistryCalendarEvent>) => {
      const item = event.openMinistryItem;
      const isMine =
        item.type === "assignment" || Boolean(item.metadata?.isMyAssignment);

      if (placement === "agenda") {
        const timeText = item.allDay
          ? "Dia todo"
          : `${formatCalendarDate(item.startsAt, "HH:mm", {
              timeZone: preferences.timezone,
            })} – ${formatCalendarDate(item.endsAt, "HH:mm", {
              timeZone: preferences.timezone,
            })}`;

        return (
          <div className="flex w-full min-w-0 items-center justify-between gap-3 px-2.5 py-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {isMine ? (
                  <span
                    className={
                      isSelected
                        ? "rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white"
                        : "rounded-full border border-primary/25 bg-secondary px-2 py-0.5 text-[11px] font-semibold text-primary"
                    }
                  >
                    {item.metadata?.functionName
                      ? `Você serve: ${item.metadata.functionName}`
                      : "Minha escala"}
                  </span>
                ) : null}
                <span className="truncate font-heading text-sm font-semibold">
                  {item.title}
                </span>
              </div>
              <p className="truncate text-xs opacity-80">
                {timeText}
                {item.location ? ` · ${item.location}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold opacity-80">
              Informações ›
            </span>
          </div>
        );
      }

      if (placement === "month-item") {
        const startTime = formatCalendarDate(item.startsAt, "HH:mm", {
          timeZone: preferences.timezone,
        });
        return (
          <div className="flex min-w-0 flex-1 items-center gap-1 text-[11px] leading-tight">
            {!item.allDay ? (
              <span className="shrink-0 font-mono font-semibold opacity-85">
                {startTime}
              </span>
            ) : null}
            <span className="truncate font-medium">
              {isMine && item.metadata?.functionName
                ? `${item.metadata.functionName} · ${item.title}`
                : item.title}
            </span>
          </div>
        );
      }

      return (
        <span className="truncate px-1 text-[11px] font-semibold leading-tight">
          {item.title}
        </span>
      );
    },
    [preferences.timezone],
  );

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        filterType={filterType}
        selectedDepartmentId={selectedDepartmentId}
        departments={departments}
        weekStartsOn={preferences.weekStartsOn}
        timeZone={preferences.timezone}
        totalCount={itemsCount.total}
        eventsCount={itemsCount.events}
        assignmentsCount={itemsCount.assignments}
        unavailabilitiesCount={itemsCount.unavailabilities}
        birthdaysCount={itemsCount.birthdays}
        weekAssignmentsCount={weekAssignmentsCount}
        canViewTeamAvailability={canViewTeamAvailability}
        canCreateEvent={canCreateEvent}
        canCreateRehearsal={canCreateRehearsal}
        onViewChange={handleViewChange}
        onFilterChange={setFilterType}
        onDepartmentChange={setSelectedDepartmentId}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onExport={handleExport}
      />

      <CalendarProvider<OpenMinistryCalendarEvent>
        events={calendarcnEvents}
        view={viewMode}
        onViewChange={handleViewChange}
        date={currentDate}
        onDateChange={setCurrentDate}
        weekStartsOn={preferences.weekStartsOn}
        locale={ptBR}
        timeZone={preferences.timezone}
        hourCycle={24}
        dayStartHour={6}
        dayEndHour={23}
        onEventSelect={handleEventSelect}
        createEvent={handleSlotCreateEvent}
        renderEventContent={renderEventContent}
      >
        <div className="h-[calc(100dvh-16rem)] min-h-[480px] overflow-hidden rounded-xl border bg-card shadow-xs sm:h-[calc(100dvh-13.5rem)] sm:min-h-[600px]">
          {viewMode === "month" && <MonthView showEventPopover={false} />}
          {viewMode === "week" && (
            <TimeGrid view="week" showEventPopover={false} scrollToHour={8} />
          )}
          {viewMode === "agenda" && <AgendaView showEventPopover={false} />}
          {viewMode === "day" && (
            <TimeGrid view="day" showEventPopover={false} scrollToHour={8} />
          )}
          {viewMode === "year" && (
            <div className="h-full overflow-y-auto">
              <YearView onDayClick={handleSelectDate} />
            </div>
          )}
        </div>
      </CalendarProvider>

      <EventPreviewSheet
        item={selectedItem}
        open={isDetailOpen}
        timeZone={preferences.timezone}
        onOpenChange={setIsDetailOpen}
      />

      {canCreateEvent ? (
        <CreateEventDialog
          departments={departments}
          defaultDate={slotCreateDate}
          defaultKind="service"
          open={slotCreateOpen}
          onOpenChange={setSlotCreateOpen}
        />
      ) : null}
    </div>
  );
}

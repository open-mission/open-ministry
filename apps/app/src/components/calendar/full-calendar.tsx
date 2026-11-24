"use client";

import {
  useCallback,
  useEffect,
  type KeyboardEvent,
  useMemo,
  useRef,
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
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromZonedTime } from "date-fns-tz";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  Clock3Icon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { EventPreviewSheet } from "@/components/calendar/event-detail-dialog";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { AgendaView } from "@/features/calendar/calendarcn/components/agenda-view";
import { CalendarProvider } from "@/features/calendar/calendarcn/components/calendar-provider";
import { useNow } from "@/features/calendar/calendarcn/hooks/use-now";
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
  calendarDateKey,
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
import { cn } from "@/lib/utils";

type FullCalendarProps = {
  initialItems: CalendarItem[];
  initialPreferences: CalendarPreferences;
  canCreateEvent?: boolean;
  canCreateRehearsal?: boolean;
  canViewTeamAvailability?: boolean;
  departments?: DepartmentOption[];
};

const MOBILE_QUERY = "(max-width: 639px)";
const CALENDAR_FALLBACK_DATE = new Date(0);

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

const MINI_WEEKDAYS_SUNDAY_FIRST = ["D", "S", "T", "Q", "Q", "S", "S"];
const MINI_WEEKDAYS_MONDAY_FIRST = ["S", "T", "Q", "Q", "S", "S", "D"];

function getCalendarItemAccent(item: CalendarItem) {
  if (item.type === "assignment") return "bg-chart-1";
  if (item.type === "unavailability") return "bg-chart-2";
  if (item.type === "birthday") return "bg-chart-5";
  if (item.metadata?.eventKind === "rehearsal" || item.color === "purple") {
    return "bg-chart-4";
  }
  return "bg-muted-foreground";
}

function getCalendarItemTypeLabel(item: CalendarItem) {
  if (item.type === "assignment") return "Minha escala";
  if (item.type === "unavailability") return "Indisponibilidade";
  if (item.type === "birthday") return "Aniversário";
  if (item.metadata?.eventKind === "rehearsal" || item.color === "purple") {
    return "Ensaio";
  }
  return "Culto ou evento";
}

function CalendarNavigationPanel({
  currentDate,
  now,
  items,
  timeZone,
  weekStartsOn,
  onDateSelect,
  onItemSelect,
  onOpenAgenda,
}: {
  currentDate: Date;
  now: Date | null;
  items: CalendarItem[];
  timeZone: string;
  weekStartsOn: 0 | 1;
  onDateSelect: (date: Date) => void;
  onItemSelect: (itemId: string) => void;
  onOpenAgenda: () => void;
}) {
  const currentDateKey = calendarDateKey(currentDate, timeZone);
  const monthAnchor = useMemo(() => {
    const dateKey = formatCalendarDate(currentDate, "yyyy-MM-dd", { timeZone });
    return new Date(`${dateKey}T12:00:00`);
  }, [currentDate, timeZone]);
  const firstGridDay = useMemo(
    () => startOfWeek(startOfMonth(monthAnchor), { weekStartsOn }),
    [monthAnchor, weekStartsOn],
  );
  const gridDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index)),
    [firstGridDay],
  );
  const [focusOverride, setFocusOverride] = useState<{
    baseDateKey: string;
    focusDateKey: string;
  } | null>(null);
  const focusedDateKey =
    focusOverride?.baseDateKey === currentDateKey
      ? focusOverride.focusDateKey
      : currentDateKey;
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusPending = useRef(false);
  useEffect(() => {
    if (!focusPending.current) return;
    dayButtonRefs.current.get(focusedDateKey)?.focus();
    focusPending.current = false;
  }, [focusedDateKey, gridDays]);

  const eventCountByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = calendarDateKey(item.startsAt, timeZone);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [items, timeZone]);

  const upcomingItems = useMemo(
    () =>
      dedupeCalendarItems(items)
        .filter((item) => now !== null && Date.parse(item.endsAt) >= now.getTime())
        .toSorted(
          (left, right) =>
            Date.parse(left.startsAt) - Date.parse(right.startsAt),
        )
        .slice(0, 4),
    [items, now],
  );

  const weekdayLabels =
    weekStartsOn === 0
      ? MINI_WEEKDAYS_SUNDAY_FIRST
      : MINI_WEEKDAYS_MONDAY_FIRST;
  const todayDateKey = now ? calendarDateKey(now, timeZone) : "";

  function getZonedDate(date: Date) {
    return fromZonedTime(`${format(date, "yyyy-MM-dd")}T12:00:00`, timeZone);
  }

  function getTodayZonedDate() {
    if (!todayDateKey) return currentDate;
    return fromZonedTime(`${todayDateKey}T12:00:00`, timeZone);
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    let nextDate: Date | null = null;
    const weekOffset = (day.getDay() - weekStartsOn + 7) % 7;

    switch (event.key) {
      case "ArrowLeft":
        nextDate = addDays(day, -1);
        break;
      case "ArrowRight":
        nextDate = addDays(day, 1);
        break;
      case "ArrowUp":
        nextDate = addDays(day, -7);
        break;
      case "ArrowDown":
        nextDate = addDays(day, 7);
        break;
      case "Home":
        nextDate = addDays(day, -weekOffset);
        break;
      case "End":
        nextDate = addDays(day, 6 - weekOffset);
        break;
      case "PageUp":
        nextDate = subMonths(day, 1);
        break;
      case "PageDown":
        nextDate = addMonths(day, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    if (!nextDate) return;
    const nextKey = format(nextDate, "yyyy-MM-dd");
    focusPending.current = true;
    setFocusOverride({ baseDateKey: currentDateKey, focusDateKey: nextKey });
    if (
      nextDate.getMonth() !== monthAnchor.getMonth() ||
      nextDate.getFullYear() !== monthAnchor.getFullYear()
    ) {
      onDateSelect(getZonedDate(nextDate));
    }
  }

  function shiftMonth(amount: number) {
    onDateSelect(getZonedDate(addMonths(monthAnchor, amount)));
  }

  return (
    <aside className="hidden h-[calc(100dvh-13rem)] min-h-[520px] w-[232px] shrink-0 flex-col gap-6 border-r border-border/70 pr-4 xl:flex">
      <section aria-label="Navegação por data" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold capitalize text-foreground">
            {format(monthAnchor, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Mês anterior"
              className="size-8 rounded-lg"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Próximo mês"
              className="size-8 rounded-lg"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div
          role="grid"
          aria-label={`Dias de ${format(monthAnchor, "MMMM yyyy", { locale: ptBR })}`}
          className="grid grid-cols-7 gap-y-1 text-center"
        >
          <div role="row" className="contents">
            {weekdayLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                role="columnheader"
                aria-label={
                  weekStartsOn === 0
                    ? ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][index]
                    : ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"][index]
                }
                className="py-1 text-[11px] font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} role="row" className="contents">
              {gridDays.slice(row * 7, row * 7 + 7).map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const count = eventCountByDay.get(dayKey) ?? 0;
                const isInMonth = day.getMonth() === monthAnchor.getMonth();
                const isSelected = dayKey === currentDateKey;
                const isToday = dayKey === todayDateKey;
                const accessibleDate = format(day, "EEEE, d 'de' MMMM", {
                  locale: ptBR,
                });

                return (
                  <div
                    key={dayKey}
                    role="gridcell"
                    aria-selected={isSelected}
                    className="flex justify-center"
                  >
                    <button
                      ref={(element) => {
                        if (element) dayButtonRefs.current.set(dayKey, element);
                        else dayButtonRefs.current.delete(dayKey);
                      }}
                      type="button"
                      aria-label={`${accessibleDate}${count ? `, ${count} ${count === 1 ? "compromisso" : "compromissos"}` : ""}`}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={isSelected}
                      tabIndex={dayKey === focusedDateKey ? 0 : -1}
                      onClick={() => onDateSelect(getZonedDate(day))}
                      onKeyDown={(event) => handleDayKeyDown(event, day)}
                      className={cn(
                        "relative flex size-8 flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "bg-primary font-semibold text-primary-foreground"
                          : isToday
                            ? "font-semibold text-primary ring-1 ring-primary/40"
                            : "text-foreground hover:bg-muted",
                        !isInMonth && !isSelected && "text-muted-foreground/60",
                      )}
                    >
                      <span className="leading-none">{format(day, "d")}</span>
                      {count > 0 ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute bottom-1 size-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-chart-1",
                          )}
                        />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onDateSelect(getTodayZonedDate())}
          className="h-9 w-full rounded-lg bg-card text-xs font-semibold"
        >
          Ir para hoje
        </Button>
      </section>

      <section
        aria-labelledby="calendar-upcoming-title"
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/70 pt-4">
          <h2
            id="calendar-upcoming-title"
            className="font-heading text-base font-semibold text-foreground"
          >
            A seguir
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {upcomingItems.length ? "Próximos dias" : "Agenda"}
          </span>
        </div>

        {upcomingItems.length > 0 ? (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {upcomingItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onItemSelect(item.id)}
                  className="flex min-h-14 w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", getCalendarItemAccent(item))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3Icon className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {formatCalendarDate(item.startsAt, "EEE, d MMM", {
                          locale: ptBR,
                          timeZone,
                        })}
                        {item.allDay
                          ? " · Dia todo"
                          : ` · ${formatCalendarDate(item.startsAt, "HH:mm", { timeZone })}`}
                      </span>
                    </span>
                    {item.location ? (
                      <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    ) : null}
                    <span className="sr-only">{getCalendarItemTypeLabel(item)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-muted/45 px-3 py-3">
            <CalendarDaysIcon
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Tudo livre nos próximos dias.
            </p>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onOpenAgenda}
          className="h-9 w-full justify-start rounded-lg px-2 text-xs font-semibold text-primary hover:bg-secondary/60"
        >
          Abrir agenda
          <ChevronRightIcon className="ml-auto size-4" aria-hidden="true" />
        </Button>
      </section>
    </aside>
  );
}

export function FullCalendar({
  initialItems,
  initialPreferences,
  canCreateEvent = false,
  canCreateRehearsal = false,
  canViewTeamAvailability = false,
  departments = [],
}: FullCalendarProps) {
  const preferences = initialPreferences;
  const now = useNow();
  const [currentDateOverride, setCurrentDateOverride] = useState<Date | null>(null);
  const currentDate = currentDateOverride ?? now ?? CALENDAR_FALLBACK_DATE;
  const setCurrentDate = useCallback(
    (nextDate: Date | ((previousDate: Date) => Date)) => {
      setCurrentDateOverride((previousDate) => {
        const baseDate = previousDate ?? now ?? CALENDAR_FALLBACK_DATE;
        return typeof nextDate === "function" ? nextDate(baseDate) : nextDate;
      });
    },
    [now],
  );
  const [chosenView, setChosenView] = useState<CalendarViewMode | null>(null);
  const [filterType, setFilterType] = useState<CalendarFilterType>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");

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
  const [slotCreateDateOverride, setSlotCreateDateOverride] =
    useState<string | null>(null);
  const slotCreateDate =
    slotCreateDateOverride ?? format(now ?? currentDate, "yyyy-MM-dd");

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
  }, [setCurrentDate, viewMode]);

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
  }, [setCurrentDate, viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(now ?? currentDate);
  }, [currentDate, now, setCurrentDate]);

  const handleSelectDate = useCallback((date: Date) => {
    setChosenView("day");
    setCurrentDate(date);
  }, [setCurrentDate]);

  const handleMiniDateSelect = useCallback((date: Date) => {
    setChosenView("month");
    setCurrentDate(date);
  }, [setCurrentDate]);

  const handleOpenAgenda = useCallback(() => {
    setCurrentDate(now ?? currentDate);
    setChosenView("agenda");
  }, [currentDate, now, setCurrentDate]);

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
    if (!now) return 0;
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
  }, [initialItems, now, preferences.timezone, preferences.weekStartsOn]);

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
      setSlotCreateDateOverride(format(range.start, "yyyy-MM-dd"));
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
      view,
      isCompact,
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

      const hasRoomForScheduleSummary =
        view === "week" &&
        placement === "time-grid" &&
        item.type === "event" &&
        item.scheduleSummary &&
        !isCompact &&
        event.end.getTime() - event.start.getTime() >= 60 * 60 * 1000;

      if (hasRoomForScheduleSummary && item.scheduleSummary) {
        const summary = item.scheduleSummary;
        const teamsLabel =
          summary.teamsAssigned === summary.teamsTotal
            ? `${summary.teamsTotal} equipes`
            : `${summary.teamsAssigned}/${summary.teamsTotal} equipes`;
        const scheduleLabel =
          summary.status === "complete"
            ? "Escala montada"
            : summary.status === "partial"
              ? "Em montagem"
              : "Sem escala";
        const ScheduleStatusIcon =
          summary.status === "complete"
            ? CheckCircle2Icon
            : summary.status === "partial"
              ? Clock3Icon
              : CircleDashedIcon;

        return (
          <div className="flex h-full min-w-0 flex-col justify-center gap-px overflow-hidden">
            <span className="truncate text-[11px] font-semibold leading-[13px]">
              {item.title}
            </span>
            <div className="hidden min-w-0 flex-col gap-px text-[11px] leading-3 opacity-80 md:flex">
              <span
                aria-label={`${summary.teamsAssigned} de ${summary.teamsTotal} equipes com pessoas escaladas`}
                className="flex min-w-0 items-center gap-1"
              >
                <UsersIcon
                  aria-hidden="true"
                  className="size-3 shrink-0"
                />
                <span className="truncate">{teamsLabel}</span>
              </span>
              <span className="flex min-w-0 items-center gap-1">
                <ScheduleStatusIcon
                  aria-hidden="true"
                  className="size-3 shrink-0"
                />
                <span className="truncate">{scheduleLabel}</span>
              </span>
            </div>
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
    <div
      aria-busy={now === null && currentDateOverride === null}
      className={cn(
        "space-y-4",
        now === null && currentDateOverride === null && "invisible",
      )}
    >
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
        <div className="flex min-w-0 gap-4">
          <CalendarNavigationPanel
            currentDate={currentDate}
            now={now}
            items={providerItems}
            timeZone={preferences.timezone}
            weekStartsOn={preferences.weekStartsOn}
            onDateSelect={handleMiniDateSelect}
            onItemSelect={handleEventSelect}
            onOpenAgenda={handleOpenAgenda}
          />
          <div className="h-[calc(100dvh-16rem)] min-h-[480px] min-w-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-xs sm:h-[calc(100dvh-13rem)] sm:min-h-[520px]">
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

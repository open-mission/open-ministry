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
  Music2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  buildFilterOptions,
  CalendarHeader,
  FilterPanelBody,
} from "@/components/calendar/calendar-header";
import {
  getItemAccent,
  getItemTypeLabel,
} from "@/components/calendar/calendar-item-style";
import { EventPreviewSheet } from "@/components/calendar/event-detail-dialog";
import {
  MobileAgendaView,
  type MobileAgendaViewMode,
} from "@/components/calendar/mobile-agenda-view";
import { CalendarAgendaView } from "@/components/calendar/views/calendar-agenda-view";
import { CalendarDayView } from "@/components/calendar/views/calendar-day-view";
import { CalendarMonthView } from "@/components/calendar/views/calendar-month-view";
import { CalendarWeekView } from "@/components/calendar/views/calendar-week-view";
import { CalendarYearView } from "@/components/calendar/views/calendar-year-view";
import { Button } from "@/components/ui/button";
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

type NativeCalendarProps = {
  initialItems: CalendarItem[];
  initialPreferences: CalendarPreferences;
  organizationName?: string;
  canCreateEvent?: boolean;
  canCreateRehearsal?: boolean;
  canViewTeamAvailability?: boolean;
  canViewSchedules?: boolean;
  departments?: DepartmentOption[];
};

const MOBILE_QUERY = "(max-width: 767px)";
const CALENDAR_FALLBACK_DATE = new Date(0);
const WEEKDAY_LABELS_SUNDAY_FIRST = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_LABELS_MONDAY_FIRST = ["S", "T", "Q", "Q", "S", "S", "D"];
const FULL_WEEKDAYS_SUNDAY_FIRST = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const FULL_WEEKDAYS_MONDAY_FIRST = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

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

function useCurrentTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function filterByDepartment(
  items: CalendarItem[],
  selectedDepartmentId: string,
): CalendarItem[] {
  if (selectedDepartmentId === "all") return items;

  return items.filter((item) => {
    if (item.type === "event" || item.type === "birthday") {
      return item.metadata?.departmentIds?.includes(selectedDepartmentId);
    }
    if (item.type === "assignment") {
      return (
        item.metadata?.departmentId === selectedDepartmentId ||
        item.metadata?.departmentIds?.includes(selectedDepartmentId)
      );
    }
    if (item.type === "unavailability") {
      return item.metadata?.departmentIds?.includes(selectedDepartmentId) ?? false;
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

function getDateAtCalendarNoon(date: Date, timeZone: string) {
  return fromZonedTime(`${format(date, "yyyy-MM-dd")}T12:00:00`, timeZone);
}

function MiniCalendar({
  currentDate,
  now,
  items,
  timeZone,
  weekStartsOn,
  onSelectDate,
}: {
  currentDate: Date;
  now: Date | null;
  items: CalendarItem[];
  timeZone: string;
  weekStartsOn: 0 | 1;
  onSelectDate: (date: Date) => void;
}) {
  const currentDateKey = calendarDateKey(currentDate, timeZone);
  const derivedMonthAnchor = useMemo(() => {
    const dateKey = formatCalendarDate(currentDate, "yyyy-MM-dd", { timeZone });
    return new Date(`${dateKey}T12:00:00`);
  }, [currentDate, timeZone]);
  const [browsedMonth, setBrowsedMonth] = useState<{
    forDateKey: string;
    anchor: Date;
  } | null>(null);
  const monthAnchor =
    browsedMonth?.forDateKey === currentDateKey
      ? browsedMonth.anchor
      : derivedMonthAnchor;
  const firstGridDay = useMemo(
    () => startOfWeek(startOfMonth(monthAnchor), { weekStartsOn }),
    [monthAnchor, weekStartsOn],
  );
  const gridDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index)),
    [firstGridDay],
  );
  const [focusedDateKey, setFocusedDateKey] = useState<string | null>(null);
  const focusPending = useRef(false);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!focusPending.current || !focusedDateKey) return;
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

  const todayDateKey = now ? calendarDateKey(now, timeZone) : "";
  const weekdayLabels =
    weekStartsOn === 0
      ? WEEKDAY_LABELS_SUNDAY_FIRST
      : WEEKDAY_LABELS_MONDAY_FIRST;
  const fullWeekdays =
    weekStartsOn === 0
      ? FULL_WEEKDAYS_SUNDAY_FIRST
      : FULL_WEEKDAYS_MONDAY_FIRST;

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const weekOffset = (day.getDay() - weekStartsOn + 7) % 7;
    let nextDate: Date | null = null;

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
    const nextDateKey = format(nextDate, "yyyy-MM-dd");
    focusPending.current = true;
    setFocusedDateKey(nextDateKey);

    if (
      nextDate.getMonth() !== monthAnchor.getMonth() ||
      nextDate.getFullYear() !== monthAnchor.getFullYear()
    ) {
      setBrowsedMonth({
        forDateKey: currentDateKey,
        anchor: startOfMonth(nextDate),
      });
    }
  }

  function shiftMonth(amount: number) {
    setBrowsedMonth({
      forDateKey: currentDateKey,
      anchor: addMonths(startOfMonth(monthAnchor), amount),
    });
  }

  return (
    <section aria-label="Navegação por data" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold capitalize text-foreground">
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
              aria-label={fullWeekdays[index]}
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
                    tabIndex={dayKey === (focusedDateKey ?? currentDateKey) ? 0 : -1}
                    onClick={() => {
                      setBrowsedMonth(null);
                      onSelectDate(getDateAtCalendarNoon(day, timeZone));
                    }}
                    onKeyDown={(event) => handleDayKeyDown(event, day)}
                    className={cn(
                      "relative flex size-8 flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isSelected && isToday
                        ? "bg-primary font-semibold text-primary-foreground ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                        : isSelected
                          ? "bg-primary font-semibold text-primary-foreground"
                          : isToday
                            ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/50"
                            : "text-foreground hover:bg-muted",
                      !isInMonth && !isSelected && !isToday && "text-muted-foreground/50",
                    )}
                  >
                    <span>{format(day, "d")}</span>
                    {count > 0 ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0.5 flex items-center gap-0.5"
                      >
                        {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                          <span
                            key={index}
                            className={cn(
                              "size-1 rounded-full",
                              isSelected ? "bg-primary-foreground/80" : "bg-primary/70",
                            )}
                          />
                        ))}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function UpcomingItems({
  now,
  items,
  timeZone,
  onSelectItem,
  onOpenAgenda,
}: {
  now: Date | null;
  items: CalendarItem[];
  timeZone: string;
  onSelectItem: (item: CalendarItem) => void;
  onOpenAgenda: () => void;
}) {
  const upcomingItems = useMemo(
    () =>
      dedupeCalendarItems(items)
        .filter((item) => now !== null && Date.parse(item.endsAt) >= now.getTime())
        .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
        .slice(0, 4),
    [items, now],
  );

  return (
    <section
      aria-label="Próximos compromissos"
      className="flex min-h-0 flex-1 flex-col gap-3 border-t border-border/70 pt-4"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold text-foreground">A seguir</h2>
        <button
          type="button"
          onClick={onOpenAgenda}
          className="min-h-8 rounded-md px-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver agenda
        </button>
      </div>

      {upcomingItems.length === 0 ? (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center">
          <CalendarDaysIcon className="mx-auto size-4 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-xs font-medium text-foreground">Sem próximos compromissos</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Ajuste os filtros ou abra a agenda completa.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto overscroll-contain pr-1">
          {upcomingItems.map((item) => {
            const isRehearsal =
              item.metadata?.eventKind === "rehearsal" || item.color === "purple";
            const summary = item.type === "event" ? item.scheduleSummary : undefined;
            const teamsLabel = summary
              ? summary.teamsAssigned === summary.teamsTotal
                ? `${summary.teamsTotal} equipes`
                : `${summary.teamsAssigned}/${summary.teamsTotal} equipes`
              : null;
            const statusLabel = summary
              ? summary.status === "complete"
                ? "Escala montada"
                : summary.status === "partial"
                  ? "Em montagem"
                  : "Sem escala"
              : null;
            const StatusIcon =
              summary?.status === "complete"
                ? CheckCircle2Icon
                : summary?.status === "partial"
                  ? Clock3Icon
                  : CircleDashedIcon;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  aria-label={`Abrir detalhes de ${item.title}`}
                  className="flex min-h-14 w-full items-start gap-2.5 py-3 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", getItemAccent(item))} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {isRehearsal ? <Music2Icon className="size-3 shrink-0" aria-hidden="true" /> : null}
                      <span className="truncate">
                        {item.allDay
                          ? "Dia todo"
                          : formatCalendarDate(item.startsAt, "EEE, d MMM · HH:mm", {
                              timeZone,
                              locale: ptBR,
                            })}
                      </span>
                    </span>
                    {summary && teamsLabel && statusLabel ? (
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="size-3 shrink-0" aria-hidden="true" />
                          {teamsLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <StatusIcon className="size-3 shrink-0" aria-hidden="true" />
                          {statusLabel}
                        </span>
                      </span>
                    ) : null}
                    {item.location ? (
                      <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    ) : null}
                    <span className="sr-only">{getItemTypeLabel(item)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NativeCalendarSidebar({
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
  onItemSelect: (item: CalendarItem) => void;
  onOpenAgenda: () => void;
}) {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col gap-5 border-r border-border/70 pr-4 md:min-h-0 xl:flex">
      <MiniCalendar
        currentDate={currentDate}
        now={now}
        items={items}
        timeZone={timeZone}
        weekStartsOn={weekStartsOn}
        onSelectDate={onDateSelect}
      />
      <UpcomingItems
        now={now}
        items={items}
        timeZone={timeZone}
        onSelectItem={onItemSelect}
        onOpenAgenda={onOpenAgenda}
      />
    </aside>
  );
}

export function NativeCalendar({
  initialItems,
  initialPreferences,
  organizationName,
  canCreateEvent = false,
  canCreateRehearsal = false,
  canViewTeamAvailability = false,
  canViewSchedules = false,
  departments = [],
}: NativeCalendarProps) {
  const now = useCurrentTime();
  const preferences = initialPreferences;
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
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("all");
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );
  const viewMode = chosenView ?? (isMobile ? "agenda" : "month");
  const effectiveViewMode: CalendarViewMode =
    isMobile && viewMode === "day" ? "agenda" : viewMode;
  const mobileViewMode: MobileAgendaViewMode =
    effectiveViewMode === "day" ? "agenda" : effectiveViewMode;

  const visibleRange = useMemo(
    () =>
      getCalendarRange(effectiveViewMode, currentDate, preferences.weekStartsOn),
    [currentDate, effectiveViewMode, preferences.weekStartsOn],
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
    [selectedDepartmentId, visibleItems],
  );
  const itemCounts = useMemo(
    () => ({
      total: dedupeCalendarItems(departmentVisibleItems).length,
      events: departmentVisibleItems.filter((item) => item.type === "event").length,
      assignments: departmentVisibleItems.filter((item) => item.type === "assignment").length,
      unavailabilities: departmentVisibleItems.filter((item) => item.type === "unavailability").length,
      birthdays: departmentVisibleItems.filter((item) => item.type === "birthday").length,
    }),
    [departmentVisibleItems],
  );
  const visibleFilteredItems = useMemo(
    () => applyTypeFilter(departmentVisibleItems, filterType),
    [departmentVisibleItems, filterType],
  );
  const navigationItems = useMemo(
    () => applyTypeFilter(filterByDepartment(initialItems, selectedDepartmentId), filterType),
    [filterType, initialItems, selectedDepartmentId],
  );
  const weekAssignmentsCount = useMemo(() => {
    if (!now) return 0;
    const currentWeek = getCalendarRange("week", now, preferences.weekStartsOn);
    return initialItems.filter(
      (item) =>
        item.type === "assignment" &&
        isCalendarItemInRange(item, currentWeek, preferences.timezone),
    ).length;
  }, [initialItems, now, preferences.timezone, preferences.weekStartsOn]);

  const handleViewChange = useCallback((view: CalendarViewMode) => {
    setChosenView(view);
  }, []);
  const handlePrev = useCallback(() => {
    setCurrentDate((previousDate) => {
      switch (effectiveViewMode) {
        case "month":
          return subMonths(previousDate, 1);
        case "week":
          return subWeeks(previousDate, 1);
        case "day":
          return subDays(previousDate, 1);
        case "year":
          return subYears(previousDate, 1);
        case "agenda":
          return subDays(previousDate, AGENDA_WINDOW_DAYS);
        default:
          return previousDate;
      }
    });
  }, [effectiveViewMode, setCurrentDate]);
  const handleNext = useCallback(() => {
    setCurrentDate((previousDate) => {
      switch (effectiveViewMode) {
        case "month":
          return addMonths(previousDate, 1);
        case "week":
          return addWeeks(previousDate, 1);
        case "day":
          return addDays(previousDate, 1);
        case "year":
          return addYears(previousDate, 1);
        case "agenda":
          return addDays(previousDate, AGENDA_WINDOW_DAYS);
        default:
          return previousDate;
      }
    });
  }, [effectiveViewMode, setCurrentDate]);
  const handleToday = useCallback(() => {
    setCurrentDate(now ?? currentDate);
  }, [currentDate, now, setCurrentDate]);
  const handleSelectDate = useCallback(
    (date: Date) => {
      if (!isMobile) {
        setChosenView("day");
      }
      setCurrentDate(date);
    },
    [isMobile, setCurrentDate],
  );
  const handleMiniDateSelect = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      if (effectiveViewMode === "month" || effectiveViewMode === "year") {
        setChosenView("day");
      }
    },
    [effectiveViewMode, setCurrentDate],
  );
  const handleSelectMonth = useCallback(
    (date: Date) => {
      setChosenView("month");
      setCurrentDate(date);
    },
    [setCurrentDate],
  );
  const handleOpenAgenda = useCallback(() => {
    setCurrentDate(now ?? currentDate);
    setChosenView("agenda");
  }, [currentDate, now, setCurrentDate]);
  const handleSelectItem = useCallback((item: CalendarItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);
  const handleResetFilters = useCallback(() => {
    setFilterType("all");
    setSelectedDepartmentId("all");
  }, []);
  const filterOptions = useMemo(
    () =>
      buildFilterOptions(
        {
          total: itemCounts.total,
          assignments: itemCounts.assignments,
          events: itemCounts.events,
          unavailabilities: itemCounts.unavailabilities,
          birthdays: itemCounts.birthdays,
        },
        canViewTeamAvailability,
      ),
    [canViewTeamAvailability, itemCounts],
  );
  const activeFilterOption = filterOptions.find(
    (option) => option.id === filterType,
  );
  const activeDepartment = departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) +
    (selectedDepartmentId !== "all" && activeDepartment ? 1 : 0);
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
  }, [preferences.timezone, visibleFilteredItems]);

  return (
    <>
      <div
        aria-busy={now === null && currentDateOverride === null}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 md:gap-4",
          now === null && currentDateOverride === null && "invisible",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col md:hidden">
          <MobileAgendaView
            organizationName={organizationName}
            currentDate={currentDate}
            now={now}
            viewMode={mobileViewMode}
            items={visibleFilteredItems}
            filterType={filterType}
            selectedDepartmentId={selectedDepartmentId}
            departments={departments}
            weekStartsOn={preferences.weekStartsOn}
            timeZone={preferences.timezone}
            activeFilterLabel={
              filterType !== "all" ? activeFilterOption?.label : null
            }
            activeDepartmentName={activeDepartment?.name ?? null}
            activeFilterCount={activeFilterCount}
            filterContent={
              <FilterPanelBody
                filterOptions={filterOptions}
                filterType={filterType}
                departments={departments}
                selectedDepartmentId={selectedDepartmentId}
                compact={false}
                onFilterChange={setFilterType}
                onDepartmentChange={setSelectedDepartmentId}
              />
            }
            canCreateEvent={canCreateEvent}
            canCreateRehearsal={canCreateRehearsal}
            canViewSchedules={canViewSchedules}
            onViewChange={handleViewChange}
            onClearFilterType={() => setFilterType("all")}
            onClearDepartment={() => setSelectedDepartmentId("all")}
            onResetFilters={handleResetFilters}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onSelectDate={handleSelectDate}
            onSelectMonth={handleSelectMonth}
            onSelectItem={handleSelectItem}
            onExport={handleExport}
          />
        </div>

        <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col md:gap-4">
          <CalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            filterType={filterType}
            selectedDepartmentId={selectedDepartmentId}
            departments={departments}
            weekStartsOn={preferences.weekStartsOn}
            timeZone={preferences.timezone}
            totalCount={itemCounts.total}
            eventsCount={itemCounts.events}
            assignmentsCount={itemCounts.assignments}
            unavailabilitiesCount={itemCounts.unavailabilities}
            birthdaysCount={itemCounts.birthdays}
            weekAssignmentsCount={weekAssignmentsCount}
            canViewTeamAvailability={canViewTeamAvailability}
            canCreateEvent={canCreateEvent}
            canCreateRehearsal={canCreateRehearsal}
            canViewSchedules={canViewSchedules}
            showSidebarToggle
            onViewChange={handleViewChange}
            onFilterChange={setFilterType}
            onDepartmentChange={setSelectedDepartmentId}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onExport={handleExport}
          />

          <div className="flex min-w-0 gap-4 md:min-h-0 md:flex-1">
            <NativeCalendarSidebar
              currentDate={currentDate}
              now={now}
              items={navigationItems}
              timeZone={preferences.timezone}
              weekStartsOn={preferences.weekStartsOn}
              onDateSelect={handleMiniDateSelect}
              onItemSelect={handleSelectItem}
              onOpenAgenda={handleOpenAgenda}
            />

            <div className="min-w-0 flex-1 md:flex md:min-h-0 md:flex-col">
              {viewMode === "month" ? (
                <CalendarMonthView
                  currentDate={currentDate}
                  now={now}
                  items={visibleFilteredItems}
                  weekStartsOn={preferences.weekStartsOn}
                  timeZone={preferences.timezone}
                  onSelectDate={handleSelectDate}
                  onSelectItem={handleSelectItem}
                />
              ) : null}
              {viewMode === "week" ? (
                <CalendarWeekView
                  currentDate={currentDate}
                  now={now}
                  items={visibleFilteredItems}
                  weekStartsOn={preferences.weekStartsOn}
                  timeZone={preferences.timezone}
                  onSelectDate={handleSelectDate}
                  onSelectItem={handleSelectItem}
                />
              ) : null}
              {viewMode === "day" ? (
                <CalendarDayView
                  currentDate={currentDate}
                  items={visibleFilteredItems}
                  timeZone={preferences.timezone}
                  onSelectItem={handleSelectItem}
                  onSwitchToMonth={() => setChosenView("month")}
                />
              ) : null}
              {viewMode === "agenda" ? (
                <CalendarAgendaView
                  currentDate={currentDate}
                  items={visibleFilteredItems}
                  timeZone={preferences.timezone}
                  onSelectItem={handleSelectItem}
                  onToday={handleToday}
                />
              ) : null}
              {viewMode === "year" ? (
                <CalendarYearView
                  currentDate={currentDate}
                  now={now}
                  items={visibleFilteredItems}
                  weekStartsOn={preferences.weekStartsOn}
                  timeZone={preferences.timezone}
                  onSelectDate={handleSelectDate}
                  onSelectMonth={handleSelectMonth}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <EventPreviewSheet
        item={selectedItem}
        open={isDetailOpen}
        timeZone={preferences.timezone}
        onOpenChange={setIsDetailOpen}
      />
    </>
  );
}

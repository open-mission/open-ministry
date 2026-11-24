"use client";

import { type ReactNode, useMemo } from "react";
import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromZonedTime } from "date-fns-tz";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";

import {
  CalendarActionsProvider,
  CalendarMobileCreateTrigger,
  CalendarMobileMoreTrigger,
} from "@/components/calendar/calendar-actions";
import {
  getItemAccent,
  getItemTypeLabel,
} from "@/components/calendar/calendar-item-style";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calendarDateKey,
  calendarTimeLabel,
  formatCalendarDate,
  type CalendarFilterType,
  type CalendarItem,
  type CalendarViewMode,
} from "@/lib/calendar";
import type { DepartmentOption } from "@/lib/departments";
import { cn } from "@/lib/utils";

export type MobileAgendaViewMode = "agenda" | "week" | "month" | "year";

type MobileAgendaViewProps = {
  organizationName?: string;
  currentDate: Date;
  now: Date | null;
  viewMode: MobileAgendaViewMode;
  items: CalendarItem[];
  filterType: CalendarFilterType;
  selectedDepartmentId: string;
  departments: DepartmentOption[];
  weekStartsOn: 0 | 1;
  timeZone?: string | null;
  activeFilterLabel?: string | null;
  activeDepartmentName?: string | null;
  activeFilterCount: number;
  filterContent: ReactNode;
  canCreateEvent: boolean;
  canCreateRehearsal: boolean;
  canViewSchedules: boolean;
  onViewChange: (view: CalendarViewMode) => void;
  onClearFilterType: () => void;
  onClearDepartment: () => void;
  onResetFilters: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (date: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
  onExport: () => void;
};

const MOBILE_TABS: { value: MobileAgendaViewMode; label: string }[] = [
  { value: "agenda", label: "Agenda" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const SHORT_WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function getShortWeekdayLabel(day: Date): string {
  return SHORT_WEEKDAY_LABELS[day.getDay()] ?? "";
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDayPeriodLabel(timeLabel: string): string {
  const hour = Number(timeLabel.split(":")[0]);
  if (!Number.isFinite(hour)) return "";
  if (hour < 6) return "madrugada";
  if (hour < 12) return "manhã";
  if (hour < 18) return "tarde";
  return "noite";
}

function formatCompactMonthTime(timeLabel: string): string {
  const [hour, minute] = timeLabel.split(":");
  if (!hour || !minute) return timeLabel;
  return `${hour}h${minute}`;
}

function getItemMetaLine(item: CalendarItem): string {
  const parts: string[] = [];
  if (item.location) {
    parts.push(item.location);
  }
  if (item.type === "assignment" && item.metadata?.functionName) {
    parts.push(`Você serve: ${item.metadata.functionName}`);
  } else if (item.subtitle) {
    parts.push(item.subtitle);
  } else {
    parts.push(getItemTypeLabel(item));
  }
  return parts.join(" · ");
}

function formatSectionDayHeading(
  dayKey: string,
  todayKey: string,
  tomorrowKey: string,
): string {
  const parsed = parseISO(`${dayKey}T12:00:00`);
  const formattedDay = capitalize(
    format(parsed, "EEEE, d MMM", { locale: ptBR }),
  );
  if (dayKey === todayKey) return `Hoje · ${formattedDay}`;
  if (dayKey === tomorrowKey) return `Amanhã · ${formattedDay}`;
  return formattedDay;
}

function sortCalendarItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
    const byTime = left.startsAt.localeCompare(right.startsAt);
    if (byTime !== 0) return byTime;
    return left.title.localeCompare(right.title, "pt-BR");
  });
}

function groupItemsByDayKey(
  items: CalendarItem[],
  timeZone?: string | null,
): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of sortCalendarItems(items)) {
    try {
      const key = calendarDateKey(item.startsAt, timeZone);
      const list = map.get(key);
      if (list) {
        list.push(item);
      } else {
        map.set(key, [item]);
      }
    } catch {
      // Ignora datas inválidas
    }
  }
  return map;
}

function toCalendarNoon(day: Date, dayKey: string, timeZone?: string | null): Date {
  return timeZone ? fromZonedTime(`${dayKey}T12:00:00`, timeZone) : day;
}

function AgendaEventCard({
  item,
  timeZone,
  onSelect,
}: {
  item: CalendarItem;
  timeZone?: string | null;
  onSelect: (item: CalendarItem) => void;
}) {
  const timeLabel = calendarTimeLabel(item.startsAt, timeZone);
  const periodLabel = item.allDay ? "todo" : getDayPeriodLabel(timeLabel);
  const metaLine = getItemMetaLine(item);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={`Abrir detalhes de ${item.title}`}
      className="flex min-h-[74px] w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
    >
      <div className="flex w-11 shrink-0 flex-col justify-center">
        <span className="text-[11px] font-semibold tabular-nums leading-tight text-foreground">
          {item.allDay ? "Dia" : timeLabel}
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">
          {periodLabel}
        </span>
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "w-[3px] shrink-0 self-stretch rounded-full min-h-10",
          getItemAccent(item),
        )}
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
          {item.title}
        </p>
        <p className="truncate text-[11px] leading-snug text-muted-foreground">
          {metaLine}
        </p>
      </div>
    </button>
  );
}

export function MobileAgendaView({
  organizationName,
  currentDate,
  now,
  viewMode,
  items,
  departments,
  weekStartsOn,
  timeZone,
  activeFilterLabel,
  activeDepartmentName,
  activeFilterCount,
  filterContent,
  canCreateEvent,
  canCreateRehearsal,
  canViewSchedules,
  onViewChange,
  onClearFilterType,
  onClearDepartment,
  onResetFilters,
  onPrev,
  onNext,
  onToday,
  onSelectDate,
  onSelectMonth,
  onSelectItem,
  onExport,
}: MobileAgendaViewProps) {
  const referenceNow = useMemo(() => now ?? currentDate, [now, currentDate]);
  const todayKey = calendarDateKey(referenceNow, timeZone);
  const tomorrowKey = calendarDateKey(addDays(referenceNow, 1), timeZone);
  const selectedKey = calendarDateKey(currentDate, timeZone);
  const todayMonthKey = todayKey.slice(0, 7);

  const itemsByDay = useMemo(
    () => groupItemsByDayKey(items, timeZone),
    [items, timeZone],
  );

  const agendaDayGroups = useMemo(() => {
    return [...itemsByDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [itemsByDay]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn });
    const end = endOfWeek(currentDate, { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [currentDate, weekStartsOn]);

  const weekOrderedGroups = useMemo(() => {
    const selectedDay = weekDays.find(
      (day) => format(day, "yyyy-MM-dd") === selectedKey,
    );
    const activeDayKey = selectedDay
      ? format(selectedDay, "yyyy-MM-dd")
      : format(weekDays[0]!, "yyyy-MM-dd");

    const selectedGroup = {
      dayKey: activeDayKey,
      items: itemsByDay.get(activeDayKey) ?? [],
      isSelected: true,
    };

    const followingGroups = weekDays
      .map((day) => format(day, "yyyy-MM-dd"))
      .filter((dayKey) => dayKey > activeDayKey)
      .map((dayKey) => ({
        dayKey,
        items: itemsByDay.get(dayKey) ?? [],
        isSelected: false,
      }))
      .filter((group) => group.items.length > 0);

    return { activeDayKey, groups: [selectedGroup, ...followingGroups] };
  }, [itemsByDay, selectedKey, weekDays]);

  const monthData = useMemo(() => {
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    const cStart = startOfWeek(mStart, { weekStartsOn });
    const cEnd = endOfWeek(mEnd, { weekStartsOn });
    const days = eachDayOfInterval({ start: cStart, end: cEnd });
    const weekdayHeaders = eachDayOfInterval({
      start: cStart,
      end: endOfWeek(cStart, { weekStartsOn }),
    }).map((day) => getShortWeekdayLabel(day));
    return { days, weekdayHeaders };
  }, [currentDate, weekStartsOn]);

  const yearMonths = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate),
    });
    const countsByMonth = new Map<string, number>();
    for (const item of items) {
      try {
        const monthKey = calendarDateKey(item.startsAt, timeZone).slice(0, 7);
        countsByMonth.set(monthKey, (countsByMonth.get(monthKey) ?? 0) + 1);
      } catch {
        // Ignora datas inválidas
      }
    }
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM");
      return {
        month,
        monthKey,
        label: capitalize(format(month, "MMMM", { locale: ptBR })),
        count: countsByMonth.get(monthKey) ?? 0,
      };
    });
  }, [currentDate, items, timeZone]);

  const selectedDayItems = itemsByDay.get(selectedKey) ?? [];

  const navigatorCopy = useMemo(() => {
    const countLabel =
      items.length === 0
        ? "sem compromissos"
        : `${items.length} ${items.length === 1 ? "compromisso" : "compromissos"}`;

    if (viewMode === "agenda") {
      const title = formatCalendarDate(currentDate, "d 'de' MMMM", {
        timeZone,
        locale: ptBR,
      });
      const weekday = formatCalendarDate(currentDate, "EEEE", {
        timeZone,
        locale: ptBR,
      });
      return {
        title,
        subtitle: `${weekday} · ${countLabel}`,
      };
    }

    if (viewMode === "week") {
      const start = weekDays[0]!;
      const end = weekDays[weekDays.length - 1]!;
      const title =
        start.getMonth() === end.getMonth()
          ? `${format(start, "d")}–${format(end, "d 'de' MMMM", { locale: ptBR })}`
          : `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM", { locale: ptBR })}`;
      return {
        title,
        subtitle:
          items.length === 0
            ? "Sem compromissos na semana"
            : `${items.length} ${items.length === 1 ? "compromisso" : "compromissos"} na semana`,
      };
    }

    if (viewMode === "month") {
      const title = capitalize(
        formatCalendarDate(currentDate, "MMMM 'de' yyyy", {
          timeZone,
          locale: ptBR,
        }),
      );
      const dayNumber = formatCalendarDate(currentDate, "d", { timeZone });
      return {
        title,
        subtitle: `Calendário mensal · ${dayNumber} selecionado`,
      };
    }

    return {
      title: formatCalendarDate(currentDate, "yyyy", { timeZone }),
      subtitle: "Visão anual · 12 meses",
    };
  }, [currentDate, items.length, timeZone, viewMode, weekDays]);

  const defaultDateInput = format(currentDate, "yyyy-MM-dd");

  return (
    <CalendarActionsProvider
      departments={departments}
      defaultDate={defaultDateInput}
      canCreateEvent={canCreateEvent}
      canCreateRehearsal={canCreateRehearsal}
      canViewSchedules={canViewSchedules}
      onExport={onExport}
      variant="mobile"
      activeFilterCount={activeFilterCount}
      filterContent={filterContent}
      onResetFilters={onResetFilters}
    >
      <section
        aria-label="Agenda mobile"
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        {/* Topo do wireframe alinhado ao Sino + Avatar globais do app */}
        <header className="flex h-11 shrink-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl leading-6 font-semibold tracking-tight text-foreground">
              Agenda
            </h1>
            {organizationName ? (
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {organizationName}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center pr-[72px] sm:pr-[82px]">
            <CalendarMobileCreateTrigger />
          </div>
        </header>

        <div aria-hidden="true" className="h-px shrink-0 bg-border/70" />

        {/* Seletor de 4 visões igual ao wireframe */}
        <Tabs
          value={viewMode}
          onValueChange={(value) => onViewChange(value as CalendarViewMode)}
          className="shrink-0"
        >
          <TabsList
            aria-label="Visualizações da agenda mobile"
            className="grid w-full grid-cols-4 gap-0.5 rounded-xl bg-muted p-1 group-data-horizontal/tabs:h-[52px]"
          >
            {MOBILE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-full rounded-[9px] px-1 text-xs font-medium text-muted-foreground data-[state=active]:border data-[state=active]:border-border/70 data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Navegador de período: título + contagem à esquerda | < Hoje > + ⋮ à direita */}
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-tight font-semibold tracking-tight text-foreground">
              {navigatorCopy.title}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {navigatorCopy.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ButtonGroup aria-label="Navegação do período mobile">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onPrev}
                aria-label="Período anterior"
                className="h-9 w-8 rounded-xl bg-card"
              >
                <ChevronLeftIcon className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToday}
                className="h-9 rounded-xl bg-card px-2.5 text-xs font-semibold text-foreground"
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onNext}
                aria-label="Próximo período"
                className="h-9 w-8 rounded-xl bg-card"
              >
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              </Button>
            </ButtonGroup>

            <CalendarMobileMoreTrigger />
          </div>
        </div>

      {activeFilterCount > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {activeFilterLabel ? (
            <button
              type="button"
              onClick={onClearFilterType}
              aria-label={`Remover filtro ${activeFilterLabel}`}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-primary/25 bg-secondary/70 px-2.5 text-[11px] font-medium text-primary"
            >
              <span>{activeFilterLabel}</span>
              <XIcon className="size-3" aria-hidden="true" />
            </button>
          ) : null}
          {activeDepartmentName ? (
            <button
              type="button"
              onClick={onClearDepartment}
              aria-label={`Remover departamento ${activeDepartmentName}`}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-primary/25 bg-secondary/70 px-2.5 text-[11px] font-medium text-primary"
            >
              <span className="max-w-[150px] truncate">{activeDepartmentName}</span>
              <XIcon className="size-3" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Conteúdo rolável da visão ativa */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
        {viewMode === "agenda" ? (
          agendaDayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarDaysIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Nenhum compromisso neste período
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ajuste os filtros em “Mais ações” ou volte para hoje.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onToday}
                className="min-h-11 rounded-xl px-4 text-xs font-semibold"
              >
                Ir para hoje
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {agendaDayGroups.map(([dayKey, dayItems]) => (
                <section key={dayKey} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[13px] font-semibold text-foreground">
                      {formatSectionDayHeading(dayKey, todayKey, tomorrowKey)}
                    </h2>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {dayItems.length} {dayItems.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayItems.map((item) => (
                      <AgendaEventCard
                        key={item.id}
                        item={item}
                        timeZone={timeZone}
                        onSelect={onSelectItem}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : null}

        {viewMode === "week" ? (
          <div className="space-y-3 pb-2">
            {/* Tira dos 7 dias da semana */}
            <div
              role="group"
              aria-label="Dias da semana"
              className="grid grid-cols-7 gap-1"
            >
              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const isSelected = dayKey === weekOrderedGroups.activeDayKey;
                const isToday = dayKey === todayKey;
                const hasItems = (itemsByDay.get(dayKey)?.length ?? 0) > 0;
                const shortDay = getShortWeekdayLabel(day);

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => onSelectDate(toCalendarNoon(day, dayKey, timeZone))}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={isSelected}
                    aria-label={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    className={cn(
                      "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : isToday
                          ? "border-primary/45 bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-semibold leading-none",
                        isSelected
                          ? "text-primary-foreground"
                          : isToday
                            ? "text-primary"
                            : "text-muted-foreground",
                      )}
                    >
                      {shortDay}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums leading-tight">
                      {format(day, "d")}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1 rounded-full",
                        hasItems
                          ? isSelected
                            ? "bg-primary-foreground/85"
                            : "bg-primary"
                          : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  Sem compromissos nesta semana
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onToday}
                  className="min-h-11 rounded-xl px-4 text-xs font-semibold"
                >
                  Ir para hoje
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {weekOrderedGroups.groups.map((group) => (
                  <section key={group.dayKey} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-[13px] font-semibold text-foreground">
                        {formatSectionDayHeading(
                          group.dayKey,
                          todayKey,
                          tomorrowKey,
                        )}
                      </h2>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "item" : "itens"}
                      </span>
                    </div>

                    {group.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                        Nenhum compromisso neste dia.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <AgendaEventCard
                            key={item.id}
                            item={item}
                            timeZone={timeZone}
                            onSelect={onSelectItem}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {viewMode === "month" ? (
          <div className="space-y-3 pb-2">
            {/* Grade mensal compacta */}
            <div className="space-y-0.5">
              <div className="grid grid-cols-7 text-center">
                {monthData.weekdayHeaders.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="py-1 text-[11px] font-semibold text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {monthData.days.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const isInMonth = isSameMonth(day, currentDate);
                  const isSelected = dayKey === selectedKey;
                  const isToday = dayKey === todayKey;
                  const dayCount = itemsByDay.get(dayKey)?.length ?? 0;

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => onSelectDate(toCalendarNoon(day, dayKey, timeZone))}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={isSelected}
                      aria-label={`${format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}${dayCount ? `, ${dayCount} compromissos` : ""}`}
                      className={cn(
                        "flex h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "bg-primary font-semibold text-primary-foreground"
                          : isToday
                            ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/35"
                            : isInMonth
                              ? "font-medium text-foreground hover:bg-muted/60"
                              : "text-muted-foreground/45 hover:bg-muted/40",
                      )}
                    >
                      <span className="leading-none">{format(day, "d")}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1 rounded-full",
                          dayCount > 0
                            ? isSelected
                              ? "bg-primary-foreground"
                              : "bg-primary"
                            : "bg-transparent",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumo + lista do dia selecionado */}
            <section className="space-y-2 border-t border-border/70 pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-semibold text-foreground">
                  {capitalize(
                    format(parseISO(`${selectedKey}T12:00:00`), "EEEE, d MMM", {
                      locale: ptBR,
                    }),
                  )}
                </h2>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {selectedDayItems.length === 0
                    ? "Sem compromissos"
                    : `${selectedDayItems.length} ${
                        selectedDayItems.length === 1
                          ? "compromisso"
                          : "compromissos"
                      }`}
                </span>
              </div>

              {selectedDayItems.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhum compromisso para este dia.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedDayItems.map((item) => {
                    const timeText = item.allDay
                      ? "Dia todo"
                      : formatCompactMonthTime(
                          calendarTimeLabel(item.startsAt, timeZone),
                        );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectItem(item)}
                        aria-label={`Abrir detalhes de ${item.title}`}
                        className="flex min-h-11 w-full items-center gap-2 rounded-xl border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="w-11 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                          {timeText}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-6 w-[3px] shrink-0 rounded-full",
                            getItemAccent(item),
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {viewMode === "year" ? (
          <div className="grid grid-cols-2 gap-2 pb-2">
            {yearMonths.map((entry) => {
              const isCurrentRealMonth = entry.monthKey === todayMonthKey;
              return (
                <button
                  key={entry.monthKey}
                  type="button"
                  onClick={() =>
                    onSelectMonth(
                      toCalendarNoon(entry.month, `${entry.monthKey}-01`, timeZone),
                    )
                  }
                  aria-current={isCurrentRealMonth ? "date" : undefined}
                  className={cn(
                    "flex min-h-[84px] flex-col justify-between gap-1.5 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrentRealMonth
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-[13px] font-semibold",
                      isCurrentRealMonth
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    {entry.label}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {entry.count === 0
                      ? "Sem compromissos"
                      : `${entry.count} ${
                          entry.count === 1 ? "compromisso" : "compromissos"
                        }`}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
    </CalendarActionsProvider>
  );
}

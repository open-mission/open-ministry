"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CakeIcon,
  CalendarDaysIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  Music2Icon,
} from "lucide-react";

import {
  calendarDateKey,
  calendarTimeLabel,
  type CalendarItem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarMonthViewProps = {
  currentDate: Date;
  now?: Date | null;
  items: CalendarItem[];
  weekStartsOn: 0 | 1;
  timeZone?: string | null;
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
};

function isRehearsalItem(item: CalendarItem): boolean {
  return item.metadata?.eventKind === "rehearsal" || item.color === "purple";
}

function ItemTypeIcon({
  type,
  rehearsal = false,
  className,
}: {
  type: CalendarItem["type"];
  rehearsal?: boolean;
  className?: string;
}) {
  if (type === "assignment") {
    return (
      <CheckCircle2Icon
        className={cn("text-emerald-600 dark:text-emerald-400", className)}
      />
    );
  }
  if (type === "unavailability") {
    return (
      <CalendarX2Icon
        className={cn("text-amber-600 dark:text-amber-400", className)}
      />
    );
  }
  if (type === "birthday") {
    return (
      <CakeIcon className={cn("text-rose-600 dark:text-rose-400", className)} />
    );
  }
  if (rehearsal) {
    return (
      <Music2Icon
        className={cn("text-violet-600 dark:text-violet-400", className)}
      />
    );
  }
  return (
    <CalendarDaysIcon className={cn("text-primary", className)} />
  );
}

export function CalendarMonthView({
  currentDate,
  now,
  items,
  weekStartsOn,
  timeZone,
  onSelectDate,
  onSelectItem,
}: CalendarMonthViewProps) {
  const { days, weekDays } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    const computedDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });

    const computedWeekDays = eachDayOfInterval({
      start: calendarStart,
      end: endOfWeek(calendarStart, { weekStartsOn }),
    }).map((day) => format(day, "EEE", { locale: ptBR }));

    return { days: computedDays, weekDays: computedWeekDays };
  }, [currentDate, weekStartsOn]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      try {
        const dayKey = calendarDateKey(item.startsAt, timeZone);
        const list = map.get(dayKey);
        if (list) {
          list.push(item);
        } else {
          map.set(dayKey, [item]);
        }
      } catch {
        // Ignore items with malformed dates
      }
    }
    return map;
  }, [items, timeZone]);

  const todayKey = calendarDateKey(now ?? new Date(), timeZone);
  const selectedKey = calendarDateKey(currentDate, timeZone);
  const hasDistinctSelection = selectedKey !== todayKey;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs md:min-h-0 md:flex-1">
      {/* Weekday headers */}
      <div className="grid shrink-0 grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold capitalize text-muted-foreground">
        {weekDays.map((weekDay, index) => (
          <div key={index} className="py-2.5">
            {weekDay}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-y text-xs md:min-h-0 md:flex-1 md:auto-rows-fr">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayKey = format(day, "yyyy-MM-dd");
          const isDayToday = dayKey === todayKey;
          const isDaySelected = hasDistinctSelection && dayKey === selectedKey;
          const dayItems = itemsByDay.get(dayKey) ?? [];

          const maxVisible = 3;
          const visibleItems = dayItems.slice(0, maxVisible);
          const remainingCount = dayItems.length - maxVisible;
          const dayLabel = format(day, "EEEE, d 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          });

          return (
            <div
              key={day.toISOString()}
              data-calendar-today={isDayToday ? "true" : undefined}
              data-calendar-selected={isDaySelected ? "true" : undefined}
              className={cn(
                "group relative flex min-h-[84px] flex-col p-1.5 transition-colors sm:min-h-[125px] md:min-h-0 md:overflow-hidden",
                !isCurrentMonth && "bg-muted/15 text-muted-foreground/60",
                isDayToday && "bg-primary/[0.07] ring-1 ring-inset ring-primary/45",
                isDaySelected && "bg-secondary/50 ring-1 ring-inset ring-primary/35",
              )}
            >
              {/* Day header: the only control that opens the day */}
              <button
                type="button"
                onClick={() => onSelectDate(day)}
                aria-current={isDayToday ? "date" : undefined}
                aria-label={`Abrir ${dayLabel}${
                  dayItems.length > 0
                    ? `, ${dayItems.length} ${
                        dayItems.length === 1 ? "compromisso" : "compromissos"
                      }`
                    : ", sem compromissos"
                }`}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-md px-1 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-7",
                  isDayToday && "bg-primary/5",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors sm:size-6",
                      isDayToday
                        ? "bg-primary font-bold text-primary-foreground shadow-xs"
                        : isDaySelected
                          ? "border border-primary/60 bg-secondary font-semibold text-primary"
                          : "text-foreground group-hover:text-primary",
                      !isCurrentMonth && !isDayToday && !isDaySelected && "text-muted-foreground/60",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {isDayToday ? (
                    <span className="hidden rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary sm:inline-flex">
                      Hoje
                    </span>
                  ) : null}
                </span>

                {dayItems.length > 0 ? (
                  <span className="hidden pr-0.5 text-xs tabular-nums text-muted-foreground sm:inline">
                    {dayItems.length}
                  </span>
                ) : null}
              </button>

              {/* Mobile: icon dots keep the cell readable at 375px */}
              <div className="mt-0.5 flex flex-wrap items-center gap-0.5 px-1 sm:hidden">
                {visibleItems.map((item) => (
                  <ItemTypeIcon
                    key={item.id}
                    type={item.type}
                    rehearsal={isRehearsalItem(item)}
                    className="size-3"
                  />
                ))}
                {remainingCount > 0 ? (
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    +{remainingCount}
                  </span>
                ) : null}
                {dayItems.length === 0 ? (
                  <span className="text-xs text-muted-foreground/50">—</span>
                ) : null}
              </div>

              {/* Desktop: readable pills */}
              <div className="hidden min-h-0 flex-1 flex-col gap-1 overflow-hidden pt-1 sm:flex">
                {visibleItems.map((item) => {
                  const startTime = calendarTimeLabel(item.startsAt, timeZone);
                  const isRehearsal = isRehearsalItem(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-1 truncate rounded px-1.5 py-1 text-left text-xs font-medium transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        item.type === "assignment" &&
                          "border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
                        item.type === "event" &&
                          !isRehearsal &&
                          "border border-primary/20 bg-primary/10 text-primary",
                        item.type === "event" &&
                          isRehearsal &&
                          "border border-violet-500/30 bg-violet-500/15 text-violet-800 dark:text-violet-300",
                        item.type === "unavailability" &&
                          "border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        item.type === "birthday" &&
                          "border border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-300",
                      )}
                      title={`${item.title}${
                        isRehearsal ? " (ensaio)" : ""
                      } (${item.allDay ? "Dia todo" : startTime})`}
                    >
                      <ItemTypeIcon
                        type={item.type}
                        rehearsal={isRehearsal}
                        className="size-3.5 shrink-0"
                      />
                      <span className="truncate font-medium">{item.title}</span>
                    </button>
                  );
                })}

                {remainingCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(day)}
                    aria-label={`Ver os ${remainingCount} compromissos restantes de ${dayLabel}`}
                    className="mt-auto px-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{remainingCount}{" "}
                    <span className="hidden lg:inline">
                      {remainingCount === 1 ? "compromisso" : "compromissos"}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

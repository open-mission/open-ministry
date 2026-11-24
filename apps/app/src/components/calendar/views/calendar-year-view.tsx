"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  calendarDateKey,
  type CalendarItem,
  type CalendarItemType,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarYearViewProps = {
  currentDate: Date;
  now?: Date | null;
  items: CalendarItem[];
  weekStartsOn: 0 | 1;
  timeZone?: string | null;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (date: Date) => void;
};

type DaySummary = {
  count: number;
  hasEvent: boolean;
  hasAssignment: boolean;
  hasUnavailability: boolean;
  hasBirthday: boolean;
};

const EMPTY_SUMMARY: DaySummary = {
  count: 0,
  hasEvent: false,
  hasAssignment: false,
  hasUnavailability: false,
  hasBirthday: false,
};

const LEGEND: { type: CalendarItemType; label: string; dot: string }[] = [
  { type: "event", label: "Culto ou evento", dot: "bg-primary" },
  { type: "assignment", label: "Minha escala", dot: "bg-emerald-500" },
  { type: "unavailability", label: "Indisponibilidade", dot: "bg-amber-500" },
  { type: "birthday", label: "Aniversário", dot: "bg-rose-500" },
];

export function CalendarYearView({
  currentDate,
  now,
  items,
  weekStartsOn,
  timeZone,
  onSelectDate,
  onSelectMonth,
}: CalendarYearViewProps) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = useMemo(
    () => eachMonthOfInterval({ start: yearStart, end: yearEnd }),
    [yearStart, yearEnd],
  );

  // One pass over the items instead of filtering the whole list for every day
  // of the year (~365 × N before).
  const summaryByDay = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const item of items) {
      const key = calendarDateKey(item.startsAt, timeZone);
      const summary = map.get(key) ?? { ...EMPTY_SUMMARY };
      summary.count += 1;
      if (item.type === "event") summary.hasEvent = true;
      if (item.type === "assignment") summary.hasAssignment = true;
      if (item.type === "unavailability") summary.hasUnavailability = true;
      if (item.type === "birthday") summary.hasBirthday = true;
      map.set(key, summary);
    }
    return map;
  }, [items, timeZone]);

  const todayKey = calendarDateKey(now ?? new Date(), timeZone);
  const todayMonthKey = todayKey.slice(0, 7);
  const selectedKey = calendarDateKey(currentDate, timeZone);
  const hasDistinctSelection = selectedKey !== todayKey;

  return (
    <div className="flex flex-col gap-4 md:min-h-0 md:flex-1">
      <ul
        aria-label="Legenda do calendário"
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
      >
        {LEGEND.map((entry) => (
          <li key={entry.type} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", entry.dot)}
            />
            {entry.label}
          </li>
        ))}
      </ul>

      <div className="md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pr-1">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((month) => {
          const mStart = startOfMonth(month);
          const mEnd = endOfMonth(month);
          const cStart = startOfWeek(mStart, { weekStartsOn });
          const cEnd = endOfWeek(mEnd, { weekStartsOn });
          const days = eachDayOfInterval({ start: cStart, end: cEnd });

          // Weekday initials
          const weekDays = eachDayOfInterval({
            start: cStart,
            end: endOfWeek(cStart, { weekStartsOn }),
          }).map((d) => format(d, "EEEEE", { locale: ptBR }));

          const isCurrentRealMonth = format(month, "yyyy-MM") === todayMonthKey;

          return (
            <div
              key={month.toISOString()}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-3 shadow-2xs transition-all hover:border-primary/30",
                isCurrentRealMonth && "border-primary/45 ring-1 ring-primary/15",
              )}
            >
              {/* Month title */}
              <div className="flex items-center justify-between gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => onSelectMonth(month)}
                  className="cursor-pointer text-left font-heading text-sm font-semibold capitalize text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {format(month, "MMMM", { locale: ptBR })}
                </button>
                {isCurrentRealMonth ? (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary">
                    Hoje
                  </span>
                ) : null}
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b pb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                {weekDays.map((wd, i) => (
                  <div key={i}>{wd}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-1 pt-1.5 text-center text-xs">
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, month);
                  const dayKey = format(day, "yyyy-MM-dd");
                  const isDayToday = dayKey === todayKey;
                  const isDaySelected = hasDistinctSelection && dayKey === selectedKey;
                  const summary = summaryByDay.get(dayKey) ?? EMPTY_SUMMARY;
                  const dateLabel = format(day, "d 'de' MMMM", {
                    locale: ptBR,
                  });
                  const countLabel =
                    summary.count === 0
                      ? "sem compromissos"
                      : summary.count === 1
                        ? "1 compromisso"
                        : `${summary.count} compromissos`;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={!isCurrentMonth}
                      onClick={() => onSelectDate(day)}
                      aria-label={`${dateLabel}, ${countLabel}`}
                      aria-current={isDayToday ? "date" : undefined}
                      aria-pressed={isDaySelected || undefined}
                      data-calendar-today={isDayToday && isCurrentMonth ? "true" : undefined}
                      data-calendar-selected={isDaySelected && isCurrentMonth ? "true" : undefined}
                      className={cn(
                        "group relative flex flex-col items-center justify-center rounded py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
                        isCurrentMonth &&
                          "cursor-pointer hover:bg-muted",
                        !isCurrentMonth && "text-muted-foreground/30",
                        isDayToday && "font-bold text-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-xs",
                          isDayToday &&
                            "bg-primary font-bold text-primary-foreground shadow-xs ring-2 ring-primary/30",
                          isCurrentMonth &&
                            isDaySelected &&
                            "border border-primary/60 bg-secondary font-semibold text-primary",
                        )}
                      >
                        {format(day, "d")}
                      </span>

                      {/* Indicator dots */}
                      {isCurrentMonth && summary.count > 0 ? (
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex gap-0.5"
                        >
                          {summary.hasAssignment && (
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                          )}
                          {summary.hasUnavailability && (
                            <span className="size-1.5 rounded-full bg-amber-500" />
                          )}
                          {summary.hasBirthday && (
                            <span className="size-1.5 rounded-full bg-rose-500" />
                          )}
                          {summary.hasEvent && !summary.hasAssignment && (
                            <span className="size-1.5 rounded-full bg-primary" />
                          )}
                        </span>
                      ) : (
                        <span className="mt-0.5 size-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

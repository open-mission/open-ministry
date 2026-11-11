"use client";

import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarYearViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  weekStartsOn: 0 | 1;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (date: Date) => void;
};

export function CalendarYearView({
  currentDate,
  items,
  weekStartsOn,
  onSelectDate,
  onSelectMonth,
}: CalendarYearViewProps) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  return (
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

        return (
          <div
            key={month.toISOString()}
            className="flex flex-col rounded-xl border bg-card p-3 shadow-2xs transition-all hover:border-primary/30"
          >
            {/* Month title */}
            <button
              type="button"
              onClick={() => onSelectMonth(month)}
              className="text-left font-heading text-sm font-semibold capitalize text-foreground hover:text-primary transition-colors pb-2 cursor-pointer"
            >
              {format(month, "MMMM", { locale: ptBR })}
            </button>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-muted-foreground pb-1 border-b">
              {weekDays.map((wd, i) => (
                <div key={i}>{wd}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1 pt-1.5 text-center text-[11px]">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, month);
                const isDayToday = isToday(day);

                // Find items for this day
                const dayItems = items.filter((item) =>
                  isSameDay(parseISO(item.startsAt), day),
                );

                const hasAssignment = dayItems.some(
                  (i) => i.type === "assignment",
                );
                const hasUnavailability = dayItems.some(
                  (i) => i.type === "unavailability",
                );
                const hasEvent = dayItems.some((i) => i.type === "event");

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => onSelectDate(day)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center py-1 rounded transition-colors cursor-pointer hover:bg-muted",
                      !isCurrentMonth && "text-muted-foreground/30 pointer-events-none",
                      isDayToday && "font-bold text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "size-5 flex items-center justify-center rounded-full text-[10px]",
                        isDayToday &&
                          "bg-primary text-primary-foreground font-bold",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Indicator dots */}
                    {isCurrentMonth && dayItems.length > 0 ? (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasAssignment && (
                          <span className="size-1 rounded-full bg-emerald-500" />
                        )}
                        {hasUnavailability && (
                          <span className="size-1 rounded-full bg-amber-500" />
                        )}
                        {hasEvent && !hasAssignment && (
                          <span className="size-1 rounded-full bg-primary" />
                        )}
                      </div>
                    ) : (
                      <span className="size-1 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

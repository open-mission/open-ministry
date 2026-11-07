"use client";

import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarX2Icon, CheckCircle2Icon } from "lucide-react";

import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarMonthViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  weekStartsOn: 0 | 1;
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
};

export function CalendarMonthView({
  currentDate,
  items,
  weekStartsOn,
  onSelectDate,
  onSelectItem,
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Generate weekday headers
  const weekDays = eachDayOfInterval({
    start: calendarStart,
    end: endOfWeek(calendarStart, { weekStartsOn }),
  }).map((d) => format(d, "EEE", { locale: ptBR }));

  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold capitalize text-muted-foreground">
        {weekDays.map((wd, i) => (
          <div key={i} className="py-2.5">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-y border-b text-xs">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          const dayItems = items.filter((item) =>
            isSameDay(parseISO(item.startsAt), day),
          );

          const maxVisible = 3;
          const visibleItems = dayItems.slice(0, maxVisible);
          const remainingCount = dayItems.length - maxVisible;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "group relative flex min-h-[105px] sm:min-h-[125px] flex-col p-1.5 transition-colors cursor-pointer hover:bg-muted/30",
                !isCurrentMonth && "bg-muted/15 text-muted-foreground/60",
                isDayToday && "bg-primary/5",
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between pb-1">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isDayToday
                      ? "bg-primary font-bold text-primary-foreground shadow-xs"
                      : "text-foreground group-hover:text-primary",
                    !isCurrentMonth && "text-muted-foreground/60",
                  )}
                >
                  {format(day, "d")}
                </span>

                {dayItems.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {dayItems.length}
                  </span>
                ) : null}
              </div>

              {/* Items pills */}
              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {visibleItems.map((item) => {
                  const startTime = format(parseISO(item.startsAt), "HH:mm");

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      className={cn(
                        "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-transform hover:scale-[1.02] cursor-pointer",
                        item.type === "assignment" &&
                          "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30",
                        item.type === "event" &&
                          "bg-primary/10 text-primary border border-primary/20",
                        item.type === "unavailability" &&
                          "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30",
                      )}
                      title={`${item.title} (${item.allDay ? "Dia todo" : startTime})`}
                    >
                      {item.type === "assignment" && (
                        <CheckCircle2Icon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {item.type === "unavailability" && (
                        <CalendarX2Icon className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <span className="truncate font-medium">{item.title}</span>
                    </button>
                  );
                })}

                {remainingCount > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(day);
                    }}
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground text-left px-1 mt-auto"
                  >
                    +{remainingCount} mais
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

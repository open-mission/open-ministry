"use client";

import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarX2Icon, CheckCircle2Icon } from "lucide-react";

import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarWeekViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  weekStartsOn: 0 | 1;
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

const weekGridClassName =
  "grid grid-cols-[3.5rem_repeat(7,6.5rem)] md:grid-cols-8";

export function CalendarWeekView({
  currentDate,
  items,
  weekStartsOn,
  onSelectDate,
  onSelectItem,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
      <div
        role="region"
        aria-label="Agenda semanal"
        tabIndex={0}
        className="overflow-x-auto overscroll-x-contain scrollbar-none focus-visible:outline-none"
      >
        <div className="min-w-[49rem] md:min-w-0">
          {/* Week Header */}
          <div
            className={cn(
              weekGridClassName,
              "border-b bg-muted/40 text-xs",
            )}
          >
            <div className="sticky left-0 z-10 flex items-center justify-center border-r bg-muted py-2.5 text-center font-medium text-muted-foreground">
              Horário
            </div>
            {days.map((day) => {
              const isDayToday = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "cursor-pointer border-r py-2 text-center transition-colors last:border-r-0 hover:bg-muted/50",
                    isDayToday && "bg-primary/5",
                  )}
                >
                  <p className="text-[11px] font-medium capitalize text-muted-foreground">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <div className="mt-0.5 flex justify-center">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                        isDayToday
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-day / Unavailability row */}
          <div
            className={cn(
              weekGridClassName,
              "min-h-[44px] border-b bg-muted/15",
            )}
          >
            <div className="sticky left-0 z-10 flex items-center justify-center border-r bg-card p-1 text-[11px] font-medium text-muted-foreground">
              Dia todo
            </div>
            {days.map((day) => {
              const dayAllDayItems = items.filter(
                (item) =>
                  item.allDay && isSameDay(parseISO(item.startsAt), day),
              );

              return (
                <div
                  key={`allday-${day.toISOString()}`}
                  className="min-h-[44px] space-y-1 border-r p-1 last:border-r-0"
                >
                  {dayAllDayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="flex w-full cursor-pointer items-center gap-1 truncate rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-left text-[10px] font-medium text-amber-800 transition-transform hover:scale-[1.02] dark:text-amber-300"
                      title={item.title}
                    >
                      <CalendarX2Icon className="size-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Hourly Grid */}
          <div className="max-h-[580px] divide-y overflow-y-auto">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className={cn(weekGridClassName, "min-h-[52px]")}
              >
                {/* Hour label */}
                <div className="sticky left-0 z-10 flex items-start justify-center border-r bg-card pt-1 font-mono text-[11px] text-muted-foreground">
                  {String(hour).padStart(2, "0")}:00
                </div>

                {/* Day columns for this hour */}
                {days.map((day) => {
                  const matchingItems = items.filter((item) => {
                    if (item.allDay) return false;
                    const itemDate = parseISO(item.startsAt);
                    return (
                      isSameDay(itemDate, day) &&
                      itemDate.getHours() === hour
                    );
                  });

                  return (
                    <div
                      key={`${hour}-${day.toISOString()}`}
                      onClick={() => onSelectDate(day)}
                      className="cursor-pointer space-y-1 border-r p-1 transition-colors last:border-r-0 hover:bg-muted/10"
                    >
                      {matchingItems.map((item) => {
                        const startTime = format(
                          parseISO(item.startsAt),
                          "HH:mm",
                        );
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectItem(item);
                            }}
                            className={cn(
                              "flex w-full cursor-pointer flex-col gap-0.5 rounded-md p-1.5 text-left text-xs shadow-2xs transition-transform hover:scale-[1.02]",
                              item.type === "assignment" &&
                                "border border-emerald-500/30 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
                              item.type === "event" &&
                                "border border-primary/20 bg-primary/10 text-primary",
                              item.type === "unavailability" &&
                                "border border-amber-500/30 bg-amber-500/15 text-amber-900 dark:text-amber-200",
                            )}
                          >
                            <div className="flex items-center gap-1 text-[11px] leading-tight font-semibold">
                              {item.type === "assignment" && (
                                <CheckCircle2Icon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {startTime}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

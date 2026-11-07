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
    <div className="flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b bg-muted/40 text-xs">
        <div className="py-2.5 text-center text-muted-foreground border-r font-medium">
          Horário
        </div>
        {days.map((day) => {
          const isDayToday = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "py-2 text-center cursor-pointer transition-colors hover:bg-muted/50 border-r last:border-r-0",
                isDayToday && "bg-primary/5",
              )}
            >
              <p className="text-[11px] font-medium capitalize text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </p>
              <div className="flex justify-center mt-0.5">
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
      <div className="grid grid-cols-8 border-b bg-muted/15 min-h-[44px]">
        <div className="flex items-center justify-center p-1 text-[11px] text-muted-foreground border-r font-medium">
          Dia todo
        </div>
        {days.map((day) => {
          const dayAllDayItems = items.filter(
            (item) => item.allDay && isSameDay(parseISO(item.startsAt), day),
          );

          return (
            <div
              key={`allday-${day.toISOString()}`}
              className="p-1 space-y-1 border-r last:border-r-0 min-h-[44px]"
            >
              {dayAllDayItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="flex w-full items-center gap-1 truncate rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-left text-[10px] font-medium text-amber-800 dark:text-amber-300 hover:scale-[1.02] transition-transform cursor-pointer"
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
      <div className="divide-y max-h-[580px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 min-h-[52px]">
            {/* Hour label */}
            <div className="flex items-start justify-center pt-1 text-[11px] font-mono text-muted-foreground border-r bg-muted/10">
              {String(hour).padStart(2, "0")}:00
            </div>

            {/* Day columns for this hour */}
            {days.map((day) => {
              const matchingItems = items.filter((item) => {
                if (item.allDay) return false;
                const itemDate = parseISO(item.startsAt);
                return isSameDay(itemDate, day) && itemDate.getHours() === hour;
              });

              return (
                <div
                  key={`${hour}-${day.toISOString()}`}
                  onClick={() => onSelectDate(day)}
                  className="p-1 space-y-1 border-r last:border-r-0 hover:bg-muted/10 transition-colors cursor-pointer"
                >
                  {matchingItems.map((item) => {
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
                          "flex w-full flex-col gap-0.5 rounded-md p-1.5 text-left text-xs transition-transform hover:scale-[1.02] cursor-pointer shadow-2xs",
                          item.type === "assignment" &&
                            "bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
                          item.type === "event" &&
                            "bg-primary/10 border border-primary/20 text-primary",
                          item.type === "unavailability" &&
                            "bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200",
                        )}
                      >
                        <div className="flex items-center gap-1 font-semibold text-[11px] leading-tight">
                          {item.type === "assignment" && (
                            <CheckCircle2Icon className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
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
  );
}

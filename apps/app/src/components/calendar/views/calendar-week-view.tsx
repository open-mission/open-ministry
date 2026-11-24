"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CakeIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  CircleDashedIcon,
  Clock3Icon,
  MapPinIcon,
  Music2Icon,
  UsersIcon,
} from "lucide-react";

import {
  calendarDateKey,
  computeGridHours,
  layoutDayTimedItems,
  type CalendarItem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarWeekViewProps = {
  currentDate: Date;
  now?: Date | null;
  items: CalendarItem[];
  weekStartsOn: 0 | 1;
  timeZone?: string | null;
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarItem) => void;
};

const HOUR_HEIGHT = 60; // Pixels per hour

const weekGridClassName =
  "grid grid-cols-[3.5rem_repeat(7,6.5rem)] md:grid-cols-8";

export function CalendarWeekView({
  currentDate,
  now,
  items,
  weekStartsOn,
  timeZone,
  onSelectDate,
  onSelectItem,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const todayKey = calendarDateKey(now ?? new Date(), timeZone);
  const selectedKey = calendarDateKey(currentDate, timeZone);
  const hasDistinctSelection = selectedKey !== todayKey;

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // Compute dynamic hours range covering all events in the week (default 07:00 - 23:00)
  const { minHour, hours } = useMemo(() => {
    return computeGridHours(items, 7, 23, timeZone);
  }, [items, timeZone]);

  const totalGridHeight = hours.length * HOUR_HEIGHT;

  const currentTimeTop = useMemo(() => {
    if (!now) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timeZone ?? undefined,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    const minutesFromStart = (hour - minHour) * 60 + minute;
    if (minutesFromStart < 0 || minutesFromStart > hours.length * 60) return null;
    return (minutesFromStart / 60) * HOUR_HEIGHT;
  }, [hours.length, minHour, now, timeZone]);

  useEffect(() => {
    const container = scrollRef.current;
    const target = selectedDayRef.current;
    if (!container || !target) return;
    if (container.scrollWidth <= container.clientWidth) return;
    const nextLeft = Math.max(
      0,
      target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2,
    );
    container.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, [selectedKey]);

  // Auto-scroll on mount to earliest event or 08:00
  useEffect(() => {
    if (!scrollRef.current) return;
    const timed = items.filter((item) => !item.allDay);
    let targetHour = 8;
    if (timed.length > 0) {
      const earliest = Math.min(
        ...timed.map(
          (item) =>
            Number(
              new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                hour12: false,
                timeZone: timeZone ?? undefined,
              }).format(new Date(item.startsAt)),
            ),
        ),
      );
      if (Number.isFinite(earliest) && earliest >= minHour) {
        targetHour = Math.max(minHour, earliest - 1);
      }
    }
    const scrollTarget = (targetHour - minHour) * HOUR_HEIGHT;
    scrollRef.current.scrollTo({ top: scrollTarget, behavior: "instant" });
  }, [items, minHour, timeZone]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs md:min-h-0 md:flex-1">
      <div
        role="region"
        aria-label="Agenda semanal"
        tabIndex={0}
        ref={scrollRef}
        className="max-h-[580px] overflow-auto overscroll-contain focus-visible:outline-none md:min-h-0 md:max-h-none md:flex-1"
      >
        <div className="min-w-[49rem] md:min-w-0">
          {/* Week Header */}
          <div
            className={cn(
              weekGridClassName,
              "sticky top-0 z-40 h-[58px] border-b bg-card text-xs shadow-2xs",
            )}
          >
            <div className="sticky left-0 top-0 z-50 flex items-center justify-center border-b border-r border-border bg-muted text-center font-medium text-muted-foreground shadow-xs">
              Horário
            </div>
            {days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const isDayToday = dayKey === todayKey;
              const isDaySelected = hasDistinctSelection && dayKey === selectedKey;
              const dayLabel = format(day, "EEEE, d 'de' MMMM", {
                locale: ptBR,
              });
              return (
                <button
                  key={day.toISOString()}
                  ref={dayKey === selectedKey ? selectedDayRef : undefined}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  aria-current={isDayToday ? "date" : undefined}
                  data-calendar-today={isDayToday ? "true" : undefined}
                  data-calendar-selected={isDaySelected ? "true" : undefined}
                  aria-label={`Abrir ${dayLabel}`}
                  className={cn(
                    "cursor-pointer border-b border-r border-border bg-card py-2 text-center transition-colors last:border-r-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isDayToday && "bg-primary/10",
                    isDaySelected && "bg-secondary/60 ring-2 ring-inset ring-primary/40",
                  )}
                >
                  <p className="flex items-center justify-center gap-1 text-xs font-medium capitalize text-muted-foreground">
                    <span>{format(day, "EEE", { locale: ptBR })}</span>
                    {isDayToday ? (
                      <span className="hidden rounded bg-primary/15 px-1 text-[11px] font-semibold leading-4 text-primary sm:inline-flex">
                        Hoje
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-0.5 flex justify-center">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                        isDayToday
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : isDaySelected
                            ? "border border-primary/60 bg-secondary text-primary"
                            : "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* All-day / Unavailability row */}
          <div
            className={cn(
              weekGridClassName,
              "sticky top-[58px] z-30 min-h-[44px] border-b bg-card shadow-2xs",
            )}
          >
            <div className="sticky left-0 z-35 flex items-center justify-center border-r bg-card p-1 text-xs font-medium text-muted-foreground shadow-xs">
              Dia todo
            </div>
            {days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayAllDayItems = items.filter(
                (item) =>
                  item.allDay &&
                  calendarDateKey(item.startsAt, timeZone) === dayKey,
              );

              return (
                <div
                  key={`allday-${day.toISOString()}`}
                  className="min-h-[44px] space-y-1 border-r bg-card p-1 last:border-r-0"
                >
                  {dayAllDayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        "flex min-h-7 w-full cursor-pointer items-center gap-1 truncate rounded px-1.5 py-1 text-left text-xs font-medium transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        item.type === "birthday"
                          ? "border border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-300"
                          : "border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300",
                      )}
                      title={item.title}
                    >
                      {item.type === "birthday" ? (
                        <CakeIcon className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <CalendarX2Icon className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Hourly Timeline Grid with Proportional Event Heights */}
          <div>
            <div
              className={cn(weekGridClassName, "relative")}
              style={{ height: `${totalGridHeight}px` }}
            >
              {/* Hour Labels Column (Pinned to Left) */}
              <div className="sticky left-0 z-20 flex flex-col border-r bg-card select-none shadow-xs">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="flex items-start justify-center border-b border-border/40 pt-1 font-mono text-xs text-muted-foreground"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* 7 Day Columns with Event Layout */}
              {days.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const isDayToday = dayKey === todayKey;
                const isDaySelected = hasDistinctSelection && dayKey === selectedKey;
                const dayTimedItems = items.filter(
                  (item) =>
                    !item.allDay &&
                    calendarDateKey(item.startsAt, timeZone) === dayKey,
                );

                const positionedItems = layoutDayTimedItems(
                  dayTimedItems,
                  minHour,
                  HOUR_HEIGHT,
                  timeZone,
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative border-r last:border-r-0 select-none",
                      isDayToday && "bg-primary/[0.04]",
                      isDaySelected && "bg-primary/[0.025] ring-1 ring-inset ring-primary/25",
                    )}
                  >
                    {isDayToday && currentTimeTop !== null ? (
                      <div
                        aria-hidden="true"
                        data-calendar-now-line=""
                        style={{ top: `${currentTimeTop}px` }}
                        className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      >
                        <span className="-ml-1 size-2 shrink-0 rounded-full bg-primary ring-2 ring-background" />
                        <span className="h-[2px] flex-1 bg-primary" />
                      </div>
                    ) : null}
                    {/* Background hour slots */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => onSelectDate(day)}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                        className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/15"
                      />
                    ))}

                    {/* Positioned Events Layer */}
                    {positionedItems.map((position) => {
                      const item = position.item;
                      const isRehearsal =
                        item.metadata?.eventKind === "rehearsal" ||
                        item.color === "purple";
                      const summary =
                        item.type === "event" ? item.scheduleSummary : undefined;
                      const ScheduleStatusIcon =
                        summary?.status === "complete"
                          ? CheckCircle2Icon
                          : summary?.status === "partial"
                            ? Clock3Icon
                            : CircleDashedIcon;
                      const teamsLabel = summary
                        ? summary.teamsAssigned === summary.teamsTotal
                          ? `${summary.teamsTotal} equipes`
                          : `${summary.teamsAssigned}/${summary.teamsTotal} equipes`
                        : null;
                      const scheduleStatusLabel =
                        summary?.status === "complete"
                          ? "Escala montada"
                          : summary?.status === "partial"
                            ? "Em montagem"
                            : summary
                              ? "Sem escala"
                              : null;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectItem(item)}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            left: `calc(${position.leftPercent}% + 2px)`,
                            width: `calc(${position.widthPercent}% - 4px)`,
                          }}
                          className={cn(
                            "absolute z-10 flex cursor-pointer flex-col overflow-hidden rounded-md p-1.5 text-left text-xs shadow-2xs transition-all hover:z-20 hover:scale-[1.01] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            item.type === "assignment" &&
                              "border border-emerald-500/40 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100",
                            item.type === "event" &&
                              !isRehearsal &&
                              "border border-primary/30 bg-primary/10 text-primary",
                            item.type === "event" &&
                              isRehearsal &&
                              "border border-violet-500/40 bg-violet-500/15 text-violet-950 dark:text-violet-100",
                            item.type === "unavailability" &&
                              "border border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100",
                          )}
                          title={`${item.title}${
                            isRehearsal ? " (ensaio)" : ""
                          } (${position.startTimeLabel} - ${position.endTimeLabel})`}
                        >
                          <div className="flex items-center gap-1 text-xs leading-tight font-semibold">
                            {item.type === "assignment" && (
                              <CheckCircle2Icon className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            )}
                            {isRehearsal && (
                              <Music2Icon className="size-3 shrink-0 text-violet-600 dark:text-violet-400" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>

                          <span className="font-mono text-[11px] text-muted-foreground">
                            {position.startTimeLabel} – {position.endTimeLabel}
                          </span>

                          {position.height >= 58 && item.subtitle ? (
                            <span className="truncate text-[11px] text-muted-foreground/90">
                              {item.subtitle}
                            </span>
                          ) : null}

                          {position.height >= 90 && item.location ? (
                            <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground/80">
                              <MapPinIcon className="size-3 shrink-0" />
                              {item.location}
                            </span>
                          ) : null}
                          {position.height >= 110 &&
                          summary &&
                          teamsLabel &&
                          scheduleStatusLabel ? (
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-muted-foreground/90">
                              <span
                                aria-label={`${summary.teamsAssigned} de ${summary.teamsTotal} equipes com pessoas escaladas`}
                                className="flex min-w-0 items-center gap-1"
                              >
                                <UsersIcon className="size-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{teamsLabel}</span>
                              </span>
                              <span className="flex min-w-0 items-center gap-1">
                                <ScheduleStatusIcon className="size-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{scheduleStatusLabel}</span>
                              </span>
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

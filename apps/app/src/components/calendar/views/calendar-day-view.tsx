"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangleIcon,
  CakeIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  MapPinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calendarDateKey,
  calendarTimeParts,
  computeGridHours,
  formatCalendarDate,
  layoutDayTimedItems,
  type CalendarItem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarDayViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  timeZone?: string | null;
  onSelectItem: (item: CalendarItem) => void;
  onSwitchToMonth?: () => void;
};

const DAY_HOUR_HEIGHT = 72; // Pixels per hour

export function CalendarDayView({
  currentDate,
  items,
  timeZone,
  onSelectItem,
  onSwitchToMonth,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayKey = calendarDateKey(currentDate, timeZone);
  const todayKey = calendarDateKey(new Date(), timeZone);
  const isCurrentDay = dayKey === todayKey;

  const dayItems = useMemo(() => {
    return items.filter(
      (item) => calendarDateKey(item.startsAt, timeZone) === dayKey,
    );
  }, [items, timeZone, dayKey]);

  const unavailabilities = useMemo(() => {
    return dayItems.filter((item) => item.type === "unavailability");
  }, [dayItems]);

  const birthdays = useMemo(() => {
    return dayItems.filter((item) => item.type === "birthday");
  }, [dayItems]);

  const timedItems = useMemo(() => {
    return dayItems.filter((item) => !item.allDay);
  }, [dayItems]);

  // Compute dynamic hours range covering all events in the day (default 07:00 - 23:00)
  const { minHour, hours } = useMemo(() => {
    return computeGridHours(timedItems, 7, 23, timeZone);
  }, [timedItems, timeZone]);

  const totalGridHeight = hours.length * DAY_HOUR_HEIGHT;

  const positionedItems = useMemo(() => {
    return layoutDayTimedItems(timedItems, minHour, DAY_HOUR_HEIGHT, timeZone);
  }, [timedItems, minHour, timeZone]);

  // Auto-scroll on mount to earliest event or 08:00
  useEffect(() => {
    if (!scrollRef.current) return;
    let targetHour = 8;
    if (timedItems.length > 0) {
      const earliest = Math.min(
        ...timedItems.map(
          (item) => calendarTimeParts(item.startsAt, timeZone).hour,
        ),
      );
      if (Number.isFinite(earliest) && earliest >= minHour) {
        targetHour = Math.max(minHour, earliest - 1);
      }
    }
    const scrollTarget = (targetHour - minHour) * DAY_HOUR_HEIGHT;
    scrollRef.current.scrollTo({ top: scrollTarget, behavior: "instant" });
  }, [timedItems, minHour, timeZone]);

  const dayLabel = formatCalendarDate(
    currentDate,
    "EEEE, dd 'de' MMMM 'de' yyyy",
    { timeZone, locale: ptBR },
  );
  const dayCountLabel =
    dayItems.length === 1
      ? "1 compromisso registrado."
      : `${dayItems.length} compromissos registrados.`;

  return (
    <div className="flex flex-col gap-4">
      {/* Birthday banner if birthdays on this day */}
      {birthdays.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-900 shadow-xs dark:text-rose-200">
          <CakeIcon className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0 space-y-1">
            <h4 className="font-heading text-sm font-semibold">
              Aniversariante(s) do dia
            </h4>
            {birthdays.map((birthday) => (
              <button
                key={birthday.id}
                type="button"
                onClick={() => onSelectItem(birthday)}
                className="block min-h-11 rounded text-left text-sm leading-relaxed text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium text-foreground">
                  {birthday.title}
                </span>
                {birthday.subtitle ? ` • ${birthday.subtitle}` : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unavailability banner if blocked on this day */}
      {unavailabilities.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 shadow-xs dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 space-y-1">
            <h4 className="font-heading text-sm font-semibold">
              {unavailabilities.length === 1
                ? "Indisponibilidade registrada para este dia"
                : "Indisponibilidades registradas para este dia"}
            </h4>
            {unavailabilities.map((unavailability) => (
              <p
                key={unavailability.id}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {unavailability.title}
                </span>
                {unavailability.subtitle
                  ? ` • ${unavailability.subtitle}`
                  : null}
              </p>
            ))}
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="ml-auto shrink-0 border-amber-500/30 text-xs hover:bg-amber-500/20"
          >
            <Link href="/dashboard/availability">Ver disponibilidade</Link>
          </Button>
        </div>
      )}

      {/* Main Day Timeline */}
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
        {/* Day Header */}
        <div className="flex flex-col gap-3 border-b bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-semibold capitalize text-foreground">
                {dayLabel}
              </h3>
              {isCurrentDay ? (
                <Badge
                  variant="secondary"
                  className="font-mono text-[11px] uppercase tracking-wide"
                >
                  Hoje
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {dayItems.length === 0
                ? "Nenhum compromisso agendado para este dia."
                : dayCountLabel}
            </p>
          </div>

          {onSwitchToMonth ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwitchToMonth}
              className="self-start text-xs text-muted-foreground hover:text-foreground sm:self-auto"
            >
              Ver mês todo
            </Button>
          ) : null}
        </div>

        {/* Timeline */}
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarDaysIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Dia livre na sua agenda
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Não há cultos, eventos ou escalas marcadas para esta data.
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            role="region"
            aria-label={`Agenda de ${dayLabel}`}
            tabIndex={0}
            className="max-h-[650px] overflow-y-auto overscroll-contain focus-visible:outline-none"
          >
            <div
              className="relative flex"
              style={{ height: `${totalGridHeight}px` }}
            >
              {/* Left Time Column (Sticky) */}
              <div className="sticky left-0 z-20 flex w-14 select-none flex-col border-r bg-card sm:w-16">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${DAY_HOUR_HEIGHT}px` }}
                    className="flex items-start justify-center border-b border-border/40 pt-2 font-mono text-xs text-muted-foreground"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day Grid Column with Events */}
              <div className="relative flex-1">
                {/* Background Hour Slots */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${DAY_HOUR_HEIGHT}px` }}
                    className="border-b border-border/40"
                  />
                ))}

                {/* Positioned Events Layer with Exact Duration Heights */}
                {positionedItems.map((position) => {
                  const item = position.item;
                  const typeLabel =
                    item.type === "assignment"
                      ? "Minha escala"
                      : item.type === "unavailability"
                        ? "Indisponibilidade"
                        : "Culto ou evento";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      style={{
                        top: `${position.top}px`,
                        height: `${position.height}px`,
                        left: `calc(${position.leftPercent}% + 4px)`,
                        width: `calc(${position.widthPercent}% - 8px)`,
                      }}
                      aria-label={`${item.title}, ${typeLabel}, ${position.startTimeLabel} às ${position.endTimeLabel}`}
                      className={cn(
                        "absolute z-10 flex cursor-pointer flex-col overflow-hidden rounded-xl border p-3.5 text-left shadow-2xs transition-all hover:z-20 hover:scale-[1.005] hover:shadow-md focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        item.type === "assignment" &&
                          "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60",
                        item.type === "event" &&
                          "border-primary/30 bg-primary/5 hover:border-primary/50",
                        item.type === "unavailability" &&
                          "border-amber-500/40 bg-amber-500/10",
                      )}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.type === "assignment" && (
                            <Badge className="border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2Icon className="mr-1 size-3" />
                              Minha Escala
                            </Badge>
                          )}
                          <h4 className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
                            {item.title}
                          </h4>
                        </div>

                        {item.subtitle ? (
                          <p className="truncate text-xs font-medium text-muted-foreground">
                            {item.subtitle}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <ClockIcon className="size-3 text-muted-foreground" />
                            {position.startTimeLabel} às{" "}
                            {position.endTimeLabel}
                          </span>

                          {item.location && position.height >= 70 ? (
                            <span className="flex items-center gap-1 truncate">
                              <MapPinIcon className="size-3 text-muted-foreground" />
                              {item.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

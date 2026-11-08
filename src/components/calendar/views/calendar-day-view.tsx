"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  computeGridHours,
  layoutDayTimedItems,
  type CalendarItem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarDayViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
  onSwitchToMonth?: () => void;
};

const DAY_HOUR_HEIGHT = 72; // Pixels per hour

export function CalendarDayView({
  currentDate,
  items,
  onSelectItem,
  onSwitchToMonth,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayItems = useMemo(() => {
    return items.filter((item) =>
      isSameDay(parseISO(item.startsAt), currentDate),
    );
  }, [items, currentDate]);

  const unavailabilities = useMemo(() => {
    return dayItems.filter((item) => item.type === "unavailability");
  }, [dayItems]);

  const timedItems = useMemo(() => {
    return dayItems.filter((item) => !item.allDay);
  }, [dayItems]);

  // Compute dynamic hours range covering all events in the day (default 07:00 - 23:00)
  const { minHour, hours } = useMemo(() => {
    return computeGridHours(timedItems, 7, 23);
  }, [timedItems]);

  const totalGridHeight = hours.length * DAY_HOUR_HEIGHT;

  const positionedItems = useMemo(() => {
    return layoutDayTimedItems(timedItems, minHour, DAY_HOUR_HEIGHT);
  }, [timedItems, minHour]);

  // Auto-scroll on mount to earliest event or 08:00
  useEffect(() => {
    if (!scrollRef.current) return;
    let targetHour = 8;
    if (timedItems.length > 0) {
      const earliest = Math.min(
        ...timedItems.map((i) => parseISO(i.startsAt).getHours()),
      );
      if (Number.isFinite(earliest) && earliest >= minHour) {
        targetHour = Math.max(minHour, earliest - 1);
      }
    }
    const scrollTarget = (targetHour - minHour) * DAY_HOUR_HEIGHT;
    scrollRef.current.scrollTo({ top: scrollTarget, behavior: "instant" });
  }, [timedItems, minHour]);

  return (
    <div className="flex flex-col gap-4">
      {/* Unavailability banner if blocked on this day */}
      {unavailabilities.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-heading font-semibold text-sm">
              Indisponibilidade Registrada para este dia
            </h4>
            {unavailabilities.map((u) => (
              <p
                key={u.id}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                {u.title} • {u.subtitle}
              </p>
            ))}
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="ml-auto shrink-0 text-xs border-amber-500/30 hover:bg-amber-500/20"
          >
            <Link href="/dashboard/availability">Ver disponibilidade</Link>
          </Button>
        </div>
      )}

      {/* Main Day Timeline */}
      <div className="flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden">
        {/* Day Header */}
        <div className="flex items-center justify-between border-b bg-muted/40 p-3 sm:px-4">
          <div>
            <h3 className="font-heading text-base font-semibold capitalize text-foreground">
              {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {dayItems.length === 0
                ? "Nenhum compromisso agendado para este dia."
                : `${dayItems.length} ${
                    dayItems.length === 1 ? "compromisso" : "compromissos"
                  } registrado(s).`}
            </p>
          </div>

          {onSwitchToMonth ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwitchToMonth}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver mês todo
            </Button>
          ) : null}
        </div>

        {/* Timeline */}
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarDaysIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">
                Dia livre na sua agenda
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Não há cultos, eventos ou escalas marcadas para esta data.
              </p>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="max-h-[650px] overflow-y-auto">
            <div
              className="relative flex"
              style={{ height: `${totalGridHeight}px` }}
            >
              {/* Left Time Column (Sticky) */}
              <div className="sticky left-0 z-20 flex flex-col w-14 sm:w-16 border-r bg-card select-none">
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
                    className="border-b border-border/40 transition-colors hover:bg-muted/10 cursor-pointer"
                  />
                ))}

                {/* Positioned Events Layer with Exact Duration Heights */}
                {positionedItems.map((pos) => {
                  const item = pos.item;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      style={{
                        top: `${pos.top}px`,
                        height: `${pos.height}px`,
                        left: `calc(${pos.leftPercent}% + 4px)`,
                        width: `calc(${pos.widthPercent}% - 8px)`,
                      }}
                      className={cn(
                        "absolute z-10 flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 shadow-2xs transition-all cursor-pointer hover:z-20 hover:scale-[1.005] hover:shadow-md",
                        item.type === "assignment" &&
                          "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60",
                        item.type === "event" &&
                          "border-primary/30 bg-primary/5 hover:border-primary/50",
                        item.type === "unavailability" &&
                          "border-amber-500/40 bg-amber-500/10",
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.type === "assignment" && (
                            <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              <CheckCircle2Icon className="size-3 mr-1" />
                              Minha Escala
                            </Badge>
                          )}
                          <h4 className="font-heading font-semibold text-sm sm:text-base text-foreground truncate">
                            {item.title}
                          </h4>
                        </div>

                        {item.subtitle ? (
                          <p className="text-xs font-medium text-muted-foreground truncate">
                            {item.subtitle}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <ClockIcon className="size-3 text-muted-foreground" />
                            {pos.startTimeLabel} às {pos.endTimeLabel}
                          </span>

                          {item.location && pos.height >= 70 ? (
                            <span className="flex items-center gap-1 truncate">
                              <MapPinIcon className="size-3 text-muted-foreground" />
                              {item.location}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {item.href && pos.height >= 80 ? (
                        <div className="self-end pt-1">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                          >
                            <Link
                              href={item.href}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver culto
                              <ExternalLinkIcon className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
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

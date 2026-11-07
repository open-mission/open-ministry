"use client";

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
import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarDayViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
  onSwitchToMonth?: () => void;
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00 to 23:00

export function CalendarDayView({
  currentDate,
  items,
  onSelectItem,
  onSwitchToMonth,
}: CalendarDayViewProps) {
  const dayItems = items.filter((item) =>
    isSameDay(parseISO(item.startsAt), currentDate),
  );

  const unavailabilities = dayItems.filter(
    (item) => item.type === "unavailability",
  );

  const timedItems = dayItems.filter((item) => !item.allDay);

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
              <p key={u.id} className="text-xs text-muted-foreground leading-relaxed">
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
          <div className="divide-y">
            {HOURS.map((hour) => {
              const hourItems = timedItems.filter((item) => {
                const itemHour = parseISO(item.startsAt).getHours();
                return itemHour === hour;
              });

              if (hourItems.length === 0) {
                return (
                  <div
                    key={hour}
                    className="flex min-h-[46px] items-start gap-4 p-2.5 transition-colors hover:bg-muted/10"
                  >
                    <span className="w-14 text-right font-mono text-xs text-muted-foreground/60 select-none">
                      {String(hour).padStart(2, "0")}:00
                    </span>
                    <div className="flex-1 border-t border-dashed border-border/40 mt-2" />
                  </div>
                );
              }

              return (
                <div
                  key={hour}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4 transition-colors hover:bg-muted/10"
                >
                  <span className="w-14 text-left sm:text-right font-mono text-xs font-semibold text-foreground shrink-0">
                    {String(hour).padStart(2, "0")}:00
                  </span>

                  <div className="flex-1 space-y-2">
                    {hourItems.map((item) => {
                      const startTime = format(
                        parseISO(item.startsAt),
                        "HH:mm",
                      );
                      const endTime = format(parseISO(item.endsAt), "HH:mm");

                      return (
                        <div
                          key={item.id}
                          onClick={() => onSelectItem(item)}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3.5 transition-all cursor-pointer hover:shadow-xs",
                            item.type === "assignment" &&
                              "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50",
                            item.type === "event" &&
                              "border-primary/20 bg-primary/2 hover:border-primary/40",
                            item.type === "unavailability" &&
                              "border-amber-500/30 bg-amber-500/5",
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.type === "assignment" && (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]">
                                  <CheckCircle2Icon className="size-3 mr-1" />
                                  Minha Escala
                                </Badge>
                              )}
                              <h4 className="font-heading font-semibold text-sm text-foreground">
                                {item.title}
                              </h4>
                            </div>

                            {item.subtitle ? (
                              <p className="text-xs font-medium text-muted-foreground">
                                {item.subtitle}
                              </p>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                              <span className="flex items-center gap-1 font-mono">
                                <ClockIcon className="size-3" />
                                {startTime} às {endTime}
                              </span>

                              {item.location ? (
                                <span className="flex items-center gap-1">
                                  <MapPinIcon className="size-3" />
                                  {item.location}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {item.href ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="self-end sm:self-center gap-1 text-xs shrink-0"
                            >
                              <Link
                                href={item.href}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver culto
                                <ExternalLinkIcon className="size-3" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

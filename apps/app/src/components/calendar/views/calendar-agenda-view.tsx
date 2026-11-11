"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CakeIcon,
  CalendarDaysIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  calendarDateKey,
  calendarTimeLabel,
  type CalendarItem,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarAgendaViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  timeZone?: string | null;
  onSelectItem: (item: CalendarItem) => void;
  onToday: () => void;
};

export function CalendarAgendaView({
  items,
  timeZone,
  onSelectItem,
  onToday,
}: CalendarAgendaViewProps) {
  const sorted = [...items].sort((a, b) => {
    const dayComparison = a.startsAt.localeCompare(b.startsAt);
    if (dayComparison !== 0) return dayComparison;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  // Group by the calendar day in the church timezone.
  const groups = new Map<string, CalendarItem[]>();
  for (const item of sorted) {
    const key = calendarDateKey(item.startsAt, timeZone);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const groupList = [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  if (groupList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card px-4 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarDaysIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Nenhum compromisso neste período
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Ajuste os filtros ou volte para hoje. A agenda mostra os próximos 30
            dias a partir da data escolhida.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onToday}>
          Ir para hoje
        </Button>
      </div>
    );
  }

  const todayKey = calendarDateKey(new Date(), timeZone);

  return (
    <div className="space-y-6">
      {groupList.map(([dayKey, dayItems], index) => {
        const date = parseISO(dayKey);
        const monthKey = format(date, "yyyy-MM");
        const previousDate =
          index > 0 ? parseISO(groupList[index - 1][0]) : null;
        const showMonthDivider =
          !previousDate || format(previousDate, "yyyy-MM") !== monthKey;
        const isCurrentDay = dayKey === todayKey;

        return (
          <div key={dayKey} className="space-y-2.5">
            {showMonthDivider ? (
              <div className="flex items-center gap-3 pt-2 first:pt-0">
                <h2 className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <div className="h-px flex-1 bg-border/70" />
              </div>
            ) : null}

            {/* Date Header */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </h3>
              {isCurrentDay ? (
                <Badge
                  variant="secondary"
                  className="font-mono text-[11px] uppercase tracking-wide"
                >
                  Hoje
                </Badge>
              ) : null}
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {/* Items for this date */}
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-2xs">
              {dayItems.map((item) => {
                const startTime = calendarTimeLabel(item.startsAt, timeZone);
                const endTime = calendarTimeLabel(item.endsAt, timeZone);
                const isTeamUnavailability =
                  item.type === "unavailability" &&
                  item.metadata?.isMine === false;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-3 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between",
                      item.type === "assignment" && "bg-emerald-500/2",
                      item.type === "unavailability" && "bg-amber-500/2",
                      item.type === "birthday" && "bg-rose-500/2",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      aria-label={`Abrir detalhes de ${item.title}`}
                      className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.type === "assignment" && (
                            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2Icon className="mr-1 size-3" />
                              Minha escala
                            </Badge>
                          )}
                          {item.type === "event" && (
                            <Badge variant="secondary" className="text-xs">
                              <CalendarDaysIcon className="mr-1 size-3 text-primary" />
                              Culto ou evento
                            </Badge>
                          )}
                          {item.type === "unavailability" && (
                            <Badge className="border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
                              <CalendarX2Icon className="mr-1 size-3" />
                              {isTeamUnavailability
                                ? "Equipe indisponível"
                                : "Minha indisponibilidade"}
                            </Badge>
                          )}
                          {item.type === "birthday" && (
                            <Badge className="border-rose-500/20 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
                              <CakeIcon className="mr-1 size-3" />
                              Aniversariante
                            </Badge>
                          )}

                          <span className="font-heading text-sm font-semibold text-foreground">
                            {item.title}
                          </span>
                        </div>

                        {item.subtitle ? (
                          <p className="text-xs font-medium text-muted-foreground">
                            {item.subtitle}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <ClockIcon className="size-3" />
                            {item.allDay
                              ? "Dia todo"
                              : `${startTime} às ${endTime}`}
                          </span>

                          {item.location ? (
                            <span className="flex items-center gap-1">
                              <MapPinIcon className="size-3" />
                              {item.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    {item.href ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1 self-end text-xs sm:self-center"
                      >
                        <Link href={item.href}>
                          {item.type === "unavailability"
                            ? "Ver disponibilidade"
                            : item.type === "birthday"
                              ? "Ver membro"
                              : "Ver culto"}
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
  );
}

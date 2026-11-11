"use client";

import Link from "next/link";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDaysIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type CalendarAgendaViewProps = {
  currentDate: Date;
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
};

export function CalendarAgendaView({
  items,
  onSelectItem,
}: CalendarAgendaViewProps) {
  // Sort items chronologically
  const sorted = [...items].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  // Group by date string (YYYY-MM-DD)
  const groups: { date: Date; items: CalendarItem[] }[] = [];

  for (const item of sorted) {
    const itemDate = parseISO(item.startsAt);
    const existingGroup = groups.find((g) => isSameDay(g.date, itemDate));

    if (existingGroup) {
      // Quando o evento é o mesmo, agrupa as escalas ou prioriza a escala sobre o evento geral
      if (item.metadata?.eventId) {
        const existingIndex = existingGroup.items.findIndex(
          (i) => i.metadata?.eventId === item.metadata?.eventId,
        );
        if (existingIndex !== -1) {
          const existingItem = existingGroup.items[existingIndex];

          // Se já existe escala e o novo é evento geral, ignora o evento genérico
          if (existingItem.type === "assignment" && item.type === "event") {
            continue;
          }

          // Se já existe evento geral e o novo é escala, substitui pelo card de escala
          if (existingItem.type === "event" && item.type === "assignment") {
            existingGroup.items[existingIndex] = item;
            continue;
          }

          // Se ambos são escalas do mesmo evento (múltiplas funções), combina as funções
          if (
            existingItem.type === "assignment" &&
            item.type === "assignment"
          ) {
            const funcs = Array.from(
              new Set([
                ...(existingItem.metadata?.functionName?.split(", ") || []),
                ...(item.metadata?.functionName?.split(", ") || []),
              ]),
            );
            existingItem.title = `Escalado: ${funcs.join(", ")}`;
            continue;
          }
        }
      }
      existingGroup.items.push(item);
    } else {
      groups.push({ date: itemDate, items: [item] });
    }
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 px-4 text-center bg-card">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CalendarDaysIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-sm text-foreground">
            Nenhum compromisso na agenda
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Não foram encontrados cultos, escalas ou bloqueios de datas neste
            período.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const formattedDate = format(
          group.date,
          "EEEE, dd 'de' MMMM 'de' yyyy",
          { locale: ptBR },
        );

        return (
          <div key={group.date.toISOString()} className="space-y-2.5">
            {/* Date Header */}
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-semibold capitalize text-foreground">
                {formattedDate}
              </h3>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {/* Items for this date */}
            <div className="divide-y rounded-xl border bg-card shadow-2xs overflow-hidden">
              {group.items.map((item) => {
                const startTime = format(parseISO(item.startsAt), "HH:mm");
                const endTime = format(parseISO(item.endsAt), "HH:mm");

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className={cn(
                      "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors cursor-pointer hover:bg-muted/10",
                      item.type === "assignment" && "bg-emerald-500/2",
                      item.type === "unavailability" && "bg-amber-500/2",
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
                        {item.type === "event" && (
                          <Badge variant="secondary" className="text-[10px]">
                            <CalendarDaysIcon className="size-3 mr-1 text-primary" />
                            Culto / Evento
                          </Badge>
                        )}
                        {item.type === "unavailability" && (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]">
                            <CalendarX2Icon className="size-3 mr-1" />
                            Indisponível
                          </Badge>
                        )}

                        <span className="font-heading font-semibold text-sm text-foreground">
                          {item.title}
                        </span>
                      </div>

                      {item.subtitle ? (
                        <p className="text-xs font-medium text-muted-foreground">
                          {item.subtitle}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
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
                          {item.type === "unavailability"
                            ? "Ver ausências"
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

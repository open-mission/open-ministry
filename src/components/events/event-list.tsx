import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardListIcon,
  RepeatIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  eventKindLabels,
  type EventKind,
} from "@/lib/event-options";
import {
  eventDateParts,
  formatEventMonthYear,
  formatEventTimeRange,
  recurrenceLabel,
  scheduleProgress,
  type EventListItem,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export function EventList({
  events,
  showSchedule = true,
}: {
  events: EventListItem[];
  showSchedule?: boolean;
}) {
  const groups: {
    label: string;
    events: EventListItem[];
  }[] = [];

  for (const event of events) {
    const label = formatEventMonthYear(event.startsAt);
    const group = groups.find((item) => item.label === label);

    if (group) {
      group.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 border-b pb-2">
            <h2 className="font-heading text-xl tracking-tight">
              {group.label}
            </h2>
            <span className="text-xs text-muted-foreground">
              {group.events.length === 1
                ? "1 encontro"
                : `${group.events.length} encontros`}
            </span>
          </div>

          <div className="space-y-2 sm:space-y-0 sm:divide-y">
            {group.events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                showSchedule={showSchedule}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EventRow({
  event,
  showSchedule,
}: {
  event: EventListItem;
  showSchedule: boolean;
}) {
  const parts = eventDateParts(event.startsAt);
  const progress = scheduleProgress(event);

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="group grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-xl border border-border/60 bg-card p-3 transition-[border-color,background-color] hover:border-primary/30 active:bg-muted/40 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:px-2 sm:py-4 sm:hover:bg-muted/50"
    >
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-secondary-foreground sm:size-14 sm:rounded-xl">
        <span className="font-heading text-xl leading-none sm:text-2xl">
          {parts.day}
        </span>
        <span className="mt-0.5 text-[0.55rem] font-medium tracking-[0.14em] text-muted-foreground sm:text-[0.6rem]">
          {parts.monthShort}
        </span>
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <p className="font-heading text-base leading-tight tracking-tight sm:text-lg">
            {event.title}
          </p>
          <Badge
            variant={event.kind === "service" ? "secondary" : "outline"}
            className="font-normal"
          >
            {eventKindLabels[event.kind as EventKind] ?? event.kind}
          </Badge>
          {event.recurrence ? (
            <Badge variant="outline" className="gap-1 font-normal">
              <RepeatIcon className="size-3" />
              {recurrenceLabel(
                event.recurrence,
                event.recurrenceInterval,
                event.startsAt,
              )}
            </Badge>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          {parts.weekday} · {formatEventTimeRange(event.startsAt, event.endsAt)}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        {event.departments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {event.departments.map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground"
              >
                {item.department.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[0.7rem] text-muted-foreground">
            Nenhum departamento definido
          </p>
        )}
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 border-t border-border/40 pt-2 sm:col-span-1 sm:justify-end sm:border-0 sm:pt-0">
        {showSchedule ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.7rem] whitespace-nowrap sm:rounded-none sm:bg-transparent sm:p-0 sm:text-xs",
              progress.status === "complete"
                ? "bg-primary/10 text-primary"
                : "bg-muted/60 text-muted-foreground",
            )}
          >
            {progress.status === "complete" ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <ClipboardListIcon className="size-3.5" />
            )}
            {progress.totalFunctions === 0
              ? "Sem funções"
              : progress.status === "empty"
                ? "Sem escala"
                : progress.status === "complete"
                  ? "Escala completa"
                  : `${progress.filledFunctions} de ${progress.totalFunctions} funções`}
          </span>
        ) : null}

        <ArrowRightIcon className="size-4 shrink-0 text-primary opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
      </div>
    </Link>
  );
}

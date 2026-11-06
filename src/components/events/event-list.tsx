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

          <div className="divide-y">
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
      className="group grid grid-cols-[auto_1fr] gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto] sm:items-center"
    >
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <span className="font-heading text-2xl leading-none">{parts.day}</span>
        <span className="mt-0.5 text-[0.6rem] font-medium tracking-[0.14em] text-muted-foreground">
          {parts.monthShort}
        </span>
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-lg leading-tight tracking-tight">
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
              {recurrenceLabel(event.recurrence, event.recurrenceInterval)}
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

      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
        {showSchedule ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs whitespace-nowrap",
              progress.status === "complete"
                ? "text-primary"
                : "text-muted-foreground",
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

        <ArrowRightIcon className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

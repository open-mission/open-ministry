import Link from "next/link";
import { ArrowRightIcon, CheckIcon, ClipboardListIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  eventDateParts,
  formatEventMonthYear,
  formatEventTimeRange,
  scheduleProgress,
  type EventListItem,
} from "@/lib/events";
import { getInitials } from "@/lib/format";
import {
  personDisplayImage,
  personDisplayName,
} from "@/lib/person-format";
import { cn } from "@/lib/utils";

export function ScheduleList({
  events,
  past = false,
}: {
  events: EventListItem[];
  past?: boolean;
}) {
  const groups: { label: string; events: EventListItem[] }[] = [];

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
          <div className="flex items-baseline justify-between gap-2 pb-1">
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
              <ScheduleRow key={event.id} event={event} past={past} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ScheduleRow({
  event,
  past,
}: {
  event: EventListItem;
  past: boolean;
}) {
  const parts = eventDateParts(event.startsAt);
  const progress = scheduleProgress(event);
  const assignments = event.schedule?.assignments ?? [];
  const people = [
    ...new Map(
      assignments.map((assignment) => [
        assignment.personId,
        assignment.person,
      ]),
    ).entries(),
  ].map(([personId, person]) => ({ personId, person }));

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      prefetch={true}
      className={cn(
        "group grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-xl border border-border/60 bg-card p-3 transition-[border-color,background-color] hover:border-primary/30 active:bg-muted/40 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:px-2 sm:py-4 sm:hover:bg-muted/50",
        past ? "opacity-75" : null,
      )}
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
        <p className="font-heading text-base leading-tight tracking-tight sm:text-lg">
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {parts.weekday} · {formatEventTimeRange(event.startsAt, event.endsAt)}
          {event.departments.length > 0
            ? ` · ${event.departments
                .map((item) => item.department.name)
                .join(", ")}`
            : ""}
        </p>

        {people.length > 0 ? (
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex -space-x-2">
              {people.slice(0, 5).map(({ personId, person }) => (
                <Avatar
                  key={personId}
                  className="size-6 ring-2 ring-card"
                  title={personDisplayName(person)}
                >
                  <AvatarImage
                    src={personDisplayImage(person) ?? undefined}
                    alt={personDisplayName(person)}
                  />
                  <AvatarFallback className="bg-primary/10 text-[0.55rem] font-medium text-primary">
                    {getInitials(personDisplayName(person))}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-[0.7rem] text-muted-foreground">
              {people.length === 1
                ? "1 pessoa escalada"
                : `${people.length} pessoas escaladas`}
            </span>
          </div>
        ) : null}
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 border-t border-border/40 pt-2 sm:col-span-1 sm:justify-end sm:border-0 sm:pt-0">
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

        <ArrowRightIcon className="size-4 shrink-0 text-primary opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
      </div>
    </Link>
  );
}

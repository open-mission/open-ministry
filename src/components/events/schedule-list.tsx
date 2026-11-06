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
      className={cn(
        "group grid grid-cols-[auto_1fr] gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[auto_1fr_auto] sm:items-center",
        past ? "opacity-75" : null,
      )}
    >
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <span className="font-heading text-2xl leading-none">{parts.day}</span>
        <span className="mt-0.5 text-[0.6rem] font-medium tracking-[0.14em] text-muted-foreground">
          {parts.monthShort}
        </span>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="font-heading text-lg leading-tight tracking-tight">
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

      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
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

        <ArrowRightIcon className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

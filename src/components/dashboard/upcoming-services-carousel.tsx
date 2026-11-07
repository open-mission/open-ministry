import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  eventDateParts,
  formatEventTimeRange,
  scheduleProgress,
  type EventListItem,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export function UpcomingServicesCarousel({
  events,
}: {
  events: EventListItem[];
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="upcoming-events-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="upcoming-events-heading"
          className="font-heading text-lg leading-none tracking-tight sm:text-xl"
        >
          Próximos encontros
        </h2>
        <Link
          href="/dashboard/events"
          className="group inline-flex items-center gap-1 pb-0.5 text-xs font-medium text-primary hover:underline"
        >
          Ver todos na agenda
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1.5 pt-0.5 snap-x snap-mandatory scroll-pl-4 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
        {events.map((event) => {
          const parts = eventDateParts(event.startsAt);
          const time = formatEventTimeRange(event.startsAt, event.endsAt);
          const progress = scheduleProgress(event);
          const assignmentsCount = event.schedule?.assignments.length ?? 0;

          return (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className={cn(
                "group flex min-w-[280px] shrink-0 snap-start flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4",
                "transition-[transform,border-color,box-shadow] duration-150 active:scale-[0.99] hover:border-primary/35 hover:shadow-sm sm:min-w-0 sm:p-5",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
              )}
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary font-semibold text-secondary-foreground">
                      <span className="font-heading text-lg leading-none">
                        {parts.day}
                      </span>
                      <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                        {parts.monthShort}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.7rem] font-medium text-muted-foreground">
                        {parts.weekday}
                      </p>
                      <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <ClockIcon className="size-3 text-muted-foreground" />
                        {time}
                      </p>
                    </div>
                  </div>

                  {progress.totalFunctions > 0 ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1.5 py-0 text-[0.65rem] font-normal",
                        progress.status === "complete"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {progress.status === "complete" ? "Escala OK" : `${progress.filledFunctions}/${progress.totalFunctions}`}
                    </Badge>
                  ) : null}
                </div>

                <div>
                  <h3 className="line-clamp-1 font-heading text-lg font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {event.title}
                  </h3>
                  {event.description ? (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <UsersIcon className="size-3.5" />
                  <span>
                    {assignmentsCount}{" "}
                    {assignmentsCount === 1 ? "escalado" : "escalados"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-0.5 text-[0.72rem] font-medium text-primary transition-transform group-hover:translate-x-0.5">
                  Acessar
                  <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

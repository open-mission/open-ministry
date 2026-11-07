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
    <section aria-labelledby="upcoming-events-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2
            id="upcoming-events-heading"
            className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            Próximos Encontros
          </h2>
        </div>
        <Link
          href="/dashboard/events"
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todos na agenda
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:px-0">
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
                "group min-w-[270px] shrink-0 snap-start rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200",
                "hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:p-5 flex flex-col justify-between gap-3",
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-secondary-foreground font-semibold">
                      <span className="font-heading text-lg leading-none">
                        {parts.day}
                      </span>
                      <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                        {parts.monthShort}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.7rem] text-muted-foreground font-medium">
                        {parts.weekday}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-foreground font-medium">
                        <ClockIcon className="size-3 text-muted-foreground" />
                        {time}
                      </p>
                    </div>
                  </div>

                  {progress.totalFunctions > 0 ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[0.65rem] font-normal px-1.5 py-0",
                        progress.status === "complete"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {progress.status === "complete" ? "Escala OK" : `${progress.filledFunctions}/${progress.totalFunctions}`}
                    </Badge>
                  ) : null}
                </div>

                <div>
                  <h3 className="font-heading text-base font-medium tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  {event.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <UsersIcon className="size-3.5" />
                  <span>
                    {assignmentsCount}{" "}
                    {assignmentsCount === 1 ? "escalado" : "escalados"}
                  </span>
                </div>
                <span className="text-primary group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 text-[0.72rem] font-medium">
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

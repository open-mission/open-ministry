import Link from "next/link";
import { CalendarIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { HomeListItem } from "@/components/home/home-list-item";
import { Badge } from "@/components/ui/badge";
import {
  formatEventFullDate,
  formatEventTimeRange,
} from "@/lib/events";

export type UpcomingEventItem = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
};

export function UpcomingEventsCard({
  events,
}: {
  events: UpcomingEventItem[];
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="home-upcoming-events-title">
      <HomeCard>
        <HomeCardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" aria-hidden="true" />
            <h2
              id="home-upcoming-events-title"
              className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              Próximos eventos
            </h2>
            <Badge className="border-0 bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground tabular-nums">
              {events.length} {events.length === 1 ? "próximo" : "próximos"}
            </Badge>
          </div>

          <div className="flex flex-col">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={index > 0 ? "border-t border-border/50" : undefined}
              >
                <HomeListItem
                  leading={
                    <span
                      className={`block size-2 rounded-full ${
                        index % 2 === 0 ? "bg-primary" : "bg-chart-2"
                      }`}
                      aria-hidden="true"
                    />
                  }
                  title={event.title}
                  meta={
                    <>
                      {formatEventFullDate(event.startsAt)} ·{" "}
                      {formatEventTimeRange(event.startsAt, event.endsAt)}
                    </>
                  }
                  trailing={
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Detalhes <span aria-hidden="true">→</span>
                    </Link>
                  }
                />
              </div>
            ))}
          </div>
        </HomeCardContent>
      </HomeCard>
    </section>
  );
}

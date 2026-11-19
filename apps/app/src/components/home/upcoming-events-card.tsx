import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { HomeDateBadge } from "@/components/home/home-list-item";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  eventDateParts,
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
    <HomeSection aria-labelledby="home-upcoming-events-title">
      <HomeSectionHeader>
        <HomeSectionTitle id="home-upcoming-events-title">
          Próximos eventos
        </HomeSectionTitle>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/dashboard/events">
              Ver agenda
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard>
        <HomeCardContent className="space-y-0">
          {events.map((event, index) => {
            const parts = eventDateParts(event.startsAt);

            return (
              <div key={event.id}>
                {index > 0 ? <Separator className="my-1" /> : null}
                <div className="flex items-center gap-3 py-2">
                  <HomeDateBadge
                    day={parts.day}
                    month={parts.monthShort}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatEventFullDate(event.startsAt)} ·{" "}
                      {formatEventTimeRange(event.startsAt, event.endsAt)}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 min-h-[44px] shrink-0 px-2.5 text-xs"
                  >
                    <Link href={`/dashboard/events/${event.id}`}>Detalhes</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}

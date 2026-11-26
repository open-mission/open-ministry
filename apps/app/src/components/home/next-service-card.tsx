import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
} from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { HomeDateBadge } from "@/components/home/home-list-item";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Button } from "@/components/ui/button";
import {
  eventDateParts,
  formatEventFullDate,
  formatEventTimeRange,
  type EventListItem,
} from "@/lib/events";

export function NextServiceCard({
  event,
}: {
  event: EventListItem | null;
}) {
  if (!event) {
    return null;
  }

  const parts = eventDateParts(event.startsAt);

  return (
    <HomeSection aria-labelledby="home-next-service-title">
      <HomeSectionHeader>
        <HomeSectionTitle id="home-next-service-title">
          Próximo evento
        </HomeSectionTitle>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/calendar">
              Ver agenda
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard className="border-primary/30 transition-colors hover:border-primary/50 hover:bg-card/90">
        <HomeCardContent>
          <Link
            href={`/events/${event.id}`}
            className="flex min-h-[44px] items-start gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HomeDateBadge day={parts.day} month={parts.monthShort} />

            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground">
                {event.title}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="tabular-nums">
                    {formatEventFullDate(event.startsAt)} ·{" "}
                    {formatEventTimeRange(event.startsAt, event.endsAt)}
                  </span>
                </span>
                {event.location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 text-primary" aria-hidden="true" />
                    <span className="truncate">{event.location}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <ChevronRightIcon
              className="size-5 shrink-0 self-center text-primary"
              aria-hidden="true"
            />
          </Link>
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}

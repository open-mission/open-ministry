import Link from "next/link";
import { ArrowRightIcon, ClockIcon, MapPinIcon } from "lucide-react";

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
  relativeDayLabel,
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
  const dayLabel =
    relativeDayLabel(event.startsAt) ?? `${parts.weekday}, ${parts.day} de ${parts.month}`;

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
            <Link href="/dashboard/events">
              Ver agenda
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard>
        <HomeCardContent className="flex items-start gap-4">
          <HomeDateBadge day={parts.day} month={parts.monthShort} />

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
                {dayLabel}
              </p>
              <h3 className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground">
                {event.title}
              </h3>
            </div>

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

            <Button
              asChild
              variant="link"
              size="sm"
              className="h-9 min-h-[44px] px-0 text-xs text-primary"
            >
              <Link href={`/dashboard/events/${event.id}`}>
                Ver detalhes
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}

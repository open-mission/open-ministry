import Link from "next/link";
import { ArrowRightIcon, ClockIcon, MapPinIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { HomeDateBadge } from "@/components/home/home-list-item";
import {
  HomeSection,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UpcomingAssignment } from "@/lib/agenda";
import {
  eventDateParts,
  formatEventTimeRange,
  relativeDayLabel,
} from "@/lib/events";

/**
 * Próxima escala da pessoa. O CTA apenas abre o encontro: a escala não tem
 * confirmação de presença no banco, então a tela não promete esse fluxo.
 */
export function NextAssignmentCard({
  assignment,
}: {
  assignment: UpcomingAssignment | null;
}) {
  if (!assignment) {
    return null;
  }

  const event = assignment.schedule.event;
  const parts = eventDateParts(event.startsAt);
  const relativeDay = relativeDayLabel(event.startsAt);
  const eventHref = `/events/${event.id}`;

  return (
    <HomeSection aria-labelledby="home-next-assignment-title">
      <HomeSectionHeader>
        <HomeSectionTitle id="home-next-assignment-title">
          Sua próxima escala
        </HomeSectionTitle>
      </HomeSectionHeader>

      <HomeCard className="border-primary/30 transition-colors hover:border-primary/50">
        <HomeCardContent className="flex flex-col gap-4">
          <Link
            href={eventHref}
            className="flex min-h-[44px] items-start gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HomeDateBadge day={parts.day} month={parts.monthShort} />

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge className="font-normal">
                  {relativeDay ?? parts.weekday}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <ClockIcon
                    className="size-3.5 text-primary"
                    aria-hidden="true"
                  />
                  {formatEventTimeRange(event.startsAt, event.endsAt)}
                </span>
              </div>

              <h3 className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground">
                {event.title}
              </h3>

              <p className="truncate text-xs text-muted-foreground">
                {assignment.department.name} · {assignment.function.name}
              </p>

              {event.location ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPinIcon
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="truncate">{event.location}</span>
                </p>
              ) : null}
            </div>
          </Link>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild className="min-h-[44px] w-full sm:w-auto">
              <Link href={eventHref}>Ver minha escala</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
            >
              <Link href="/schedules">
                Minhas escalas
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}

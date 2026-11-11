import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import type { UpcomingAssignment } from "@/lib/agenda";
import { Badge } from "@/components/ui/badge";
import {
  eventDateParts,
  formatEventTimeRange,
  relativeDayLabel,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export function AssignmentList({
  assignments,
  past = false,
}: {
  assignments: UpcomingAssignment[];
  past?: boolean;
}) {
  return (
    <ul className="divide-y">
      {assignments.map((assignment) => {
        const event = assignment.schedule.event;
        const parts = eventDateParts(event.startsAt);
        const relativeDay = past ? null : relativeDayLabel(event.startsAt);

        return (
          <li key={assignment.id}>
            <Link
              href={`/dashboard/events/${event.id}`}
              className={cn(
                "flex items-center gap-3 py-3 transition-colors hover:bg-muted/50",
                past ? "opacity-75" : null,
              )}
            >
              <span className="flex w-10 shrink-0 flex-col items-center">
                <span className="font-heading text-xl leading-none">
                  {parts.day}
                </span>
                <span className="mt-0.5 text-[0.6rem] tracking-[0.12em] text-muted-foreground">
                  {parts.monthShort}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {relativeDay ? (
                    <Badge className="font-normal">{relativeDay}</Badge>
                  ) : null}
                  <p className="truncate text-sm font-medium">{event.title}</p>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {parts.weekday} ·{" "}
                  {formatEventTimeRange(event.startsAt, event.endsAt)} ·{" "}
                  {assignment.department.name} ·{" "}
                  {assignment.function.name}
                </p>
                {!past ? (
                  <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                    Chegue 30 min antes para se organizar.
                  </p>
                ) : null}
              </div>
              <ArrowRightIcon className="size-4 shrink-0 text-primary" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

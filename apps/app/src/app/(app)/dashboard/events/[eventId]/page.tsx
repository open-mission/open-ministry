import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeftIcon, MapPinIcon, RepeatIcon } from "lucide-react";

import { getEventUnavailablePeopleAction } from "@/app/actions/availability";
import { EventActionsMenu } from "@/components/events/event-actions-menu";
import { EventTabs } from "@/components/events/event-tabs";
import { PlanEditor } from "@/components/events/plan-editor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listDepartmentOptions,
  listDepartmentsByIds,
} from "@/lib/departments";
import {
  eventDateParts,
  formatEventFullDate,
  formatEventTimeRange,
  getEvent,
  getSeriesOccurrenceCount,
  recurrenceLabel,
  toInputDate,
  toInputTime,
} from "@/lib/events";
import { eventKindLabels, type EventKind } from "@/lib/event-options";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeopleSummary } from "@/lib/people";
import { personDisplayImage } from "@/lib/person-format";
import { can } from "@/lib/permissions/service";
import { listSongs } from "@/lib/songs";

export const metadata: Metadata = {
  title: "Culto ou evento",
};

type EventSearchParams = {
  tab?: string;
};

export default function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<EventSearchParams>;
}) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EventContent({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<EventSearchParams>;
}) {
  await connection();

  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  // The event fetch and the access check are independent, and the subsequent
  // permission checks share the same cached permission bundles.
  const [hasAccess, event] = await Promise.all([
    can("agenda", "read"),
    getEvent(organization.id, eventId),
  ]);

  if (!hasAccess) {
    notFound();
  }

  if (!event) {
    notFound();
  }

  const actingDepartmentIds = event.departments.map(
    (item) => item.departmentId,
  );

  const [
    canEditEvent,
    canDeleteEvent,
    canManagePlan,
    departmentOptions,
    actingDepartments,
    people,
    unavailablePeopleMap,
    songs,
    seriesOccurrences,
  ] = await Promise.all([
    can("agenda", "updateEvent", { eventId: event.id }),
    can("agenda", "deleteEvent", { eventId: event.id }),
    can("schedules", "editPlan", { eventId: event.id }),
    listDepartmentOptions(organization.id),
    listDepartmentsByIds(organization.id, actingDepartmentIds),
    listPeopleSummary(organization.id),
    getEventUnavailablePeopleAction(event.id, event.startsAt),
    listSongs(organization.id),
    event.seriesId
      ? getSeriesOccurrenceCount(organization.id, event.seriesId)
      : Promise.resolve(0),
  ]);
  const assignments = event.schedule?.assignments ?? [];
  const departmentAssignmentCounts = assignments.reduce<Record<string, number>>(
    (counts, assignment) => {
      counts[assignment.departmentId] =
        (counts[assignment.departmentId] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const parts = eventDateParts(event.startsAt);
  const defaultDuration = Math.round(
    (event.endsAt.getTime() - event.startsAt.getTime()) / 60_000,
  );
  const defaultTab = query.tab === "teams" ? "teams" : "order";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="hidden sm:block">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Cultos e eventos
        </Link>
      </div>

      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-20 sm:rounded-2xl">
              <span className="font-heading text-xl leading-none sm:text-3xl">
                {parts.day}
              </span>
              <span className="mt-0.5 text-[0.55rem] font-medium tracking-[0.14em] text-primary-foreground/70 sm:mt-1 sm:text-[0.65rem]">
                {parts.monthShort}
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl leading-tight tracking-tight sm:text-4xl">
                  {event.title}
                </h1>
                <Badge
                  variant={event.kind === "service" ? "secondary" : "outline"}
                  className="font-normal"
                >
                  {eventKindLabels[event.kind as EventKind] ?? event.kind}
                </Badge>
                {event.seriesId ? (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <RepeatIcon className="size-3" />
                    {recurrenceLabel(
                      event.recurrence,
                      event.recurrenceInterval,
                      event.startsAt,
                    ) ?? "Série"}
                  </Badge>
                ) : null}
                {canEditEvent || canDeleteEvent ? (
                  <EventActionsMenu
                    event={{
                      id: event.id,
                      title: event.title,
                      description: event.description,
                      kind: event.kind,
                      location: event.location,
                      seriesId: event.seriesId,
                    }}
                    departments={departmentOptions}
                    selectedDepartmentIds={actingDepartmentIds}
                    departmentAssignmentCounts={departmentAssignmentCounts}
                    seriesOccurrences={seriesOccurrences}
                    defaultDate={toInputDate(event.startsAt)}
                    defaultTime={toInputTime(event.startsAt)}
                    defaultDuration={defaultDuration}
                    canEdit={canEditEvent}
                    canDelete={canDeleteEvent}
                  />
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">
                {parts.weekday}, {formatEventFullDate(event.startsAt)} ·{" "}
                {formatEventTimeRange(event.startsAt, event.endsAt)}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {event.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5" />
                    {event.location}
                  </span>
                ) : null}
                {event.seriesId && event.recurrenceEndsAt ? (
                  <span>
                    Repete até {formatEventFullDate(event.recurrenceEndsAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {event.description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        ) : null}

        {event.departments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {event.departments.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/departments/${item.departmentId}`}
                prefetch={true}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                {item.department.name}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <EventTabs
        defaultTab={defaultTab}
        planItemsCount={event.planItems?.length ?? 0}
        eventId={event.id}
        departments={actingDepartments}
        assignments={assignments}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
        unavailablePeopleMap={unavailablePeopleMap}
        plan={
          <PlanEditor
            eventId={event.id}
            eventTitle={event.title}
            startsAt={event.startsAt}
            endsAt={event.endsAt}
            planItems={event.planItems ?? []}
            people={people.map((p) => ({
              id: p.id,
              name: p.name,
              avatarUrl: personDisplayImage(p),
            }))}
            songs={songs.map((s) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              tone: s.tone,
            }))}
            canManage={canManagePlan}
          />
        }
      />
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <div className="flex items-start gap-4">
        <Skeleton className="size-20 rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

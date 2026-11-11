import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  ClockIcon,
  MapPinIcon,
  RepeatIcon,
  UsersIcon,
} from "lucide-react";

import { getEventUnavailablePeopleAction } from "@/app/actions/availability";
import { EventActionsMenu } from "@/components/events/event-actions-menu";
import { PlanEditor } from "@/components/events/plan-editor";
import { ScheduleEditor } from "@/components/events/schedule-editor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listDepartments } from "@/lib/departments";
import {
  eventDateParts,
  formatEventFullDate,
  formatEventTimeRange,
  getEvent,
  recurrenceLabel,
  scheduleProgress,
  toInputDate,
  toInputTime,
} from "@/lib/events";
import { eventKindLabels, type EventKind } from "@/lib/event-options";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";
import { personDisplayImage } from "@/lib/person-format";
import { can } from "@/lib/permissions/service";
import { listSongs } from "@/lib/songs";

export const metadata: Metadata = {
  title: "Culto ou evento",
};

export default function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventContent params={params} />
    </Suspense>
  );
}

async function EventContent({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await connection();

  const { eventId } = await params;
  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const hasAccess = await can("agenda", "read");
  if (!hasAccess) {
    notFound();
  }

  const event = await getEvent(organization.id, eventId);

  if (!event) {
    notFound();
  }

  const [canEditEvent, canDeleteEvent] = await Promise.all([
    can("agenda", "updateEvent", { eventId: event.id }),
    can("agenda", "deleteEvent", { eventId: event.id }),
  ]);

  const [departments, people, unavailablePeopleMap, songs] = await Promise.all([
    listDepartments(organization.id),
    listPeople(organization.id),
    getEventUnavailablePeopleAction(event.id),
    listSongs(organization.id),
  ]);
  const actingIds = new Set(
    event.departments.map((item) => item.departmentId),
  );
  const actingDepartments = departments.filter((department) =>
    actingIds.has(department.id),
  );
  const assignments = event.schedule?.assignments ?? [];
  const progress = scheduleProgress(event);
  const parts = eventDateParts(event.startsAt);
  const defaultDuration = Math.round(
    (event.endsAt.getTime() - event.startsAt.getTime()) / 60_000,
  );
  const canManagePlan = await can("schedules", "editPlan", {
    eventId: event.id,
  });

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
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <span className="font-heading text-3xl leading-none">
                {parts.day}
              </span>
              <span className="mt-1 text-[0.65rem] font-medium tracking-[0.14em] text-primary-foreground/70">
                {parts.monthShort}
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-4xl leading-tight tracking-tight">
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
                    departments={departments.map((department) => ({
                      id: department.id,
                      name: department.name,
                    }))}
                    selectedDepartmentIds={[...actingIds]}
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

      <Tabs defaultValue="order" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit sm:inline-flex group-data-horizontal/tabs:h-10 h-10 p-1 items-stretch rounded-xl bg-muted">
          <TabsTrigger
            value="order"
            className="h-8 flex items-center justify-center gap-1.5 px-2.5 text-xs sm:text-sm sm:gap-2 sm:px-3"
          >
            <ClockIcon className="size-3.5 sm:size-4 shrink-0" />
            <span className="truncate">Cronograma do Culto</span>
            {event.planItems?.length ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold text-primary shrink-0">
                {event.planItems.length}
              </span>
            ) : null}
          </TabsTrigger>

          <TabsTrigger
            value="teams"
            className="h-8 flex items-center justify-center gap-1.5 px-2.5 text-xs sm:text-sm sm:gap-2 sm:px-3"
          >
            <UsersIcon className="size-3.5 sm:size-4 shrink-0" />
            <span className="truncate">Escala & Equipes</span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] font-semibold text-muted-foreground shrink-0">
              {progress.assignmentsCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order">
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
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <h2 className="font-heading text-2xl tracking-tight">Equipes e Funções</h2>
            <span className="text-xs text-muted-foreground">
              {progress.totalFunctions === 0
                ? "Sem funções definidas"
                : `${progress.filledFunctions} de ${progress.totalFunctions} funções preenchidas · ${progress.assignmentsCount} ${
                    progress.assignmentsCount === 1
                      ? "pessoa escalada"
                      : "pessoas escaladas"
                  }`}
            </span>
          </div>

          {actingDepartments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ClipboardListIcon className="size-5" />
              </span>
              <div className="max-w-md space-y-1">
                <p className="text-sm font-medium">
                  Nenhum departamento atuando
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isAdmin
                    ? "Edite o evento para escolher os departamentos. Depois, volte aqui para escalar as pessoas em cada função."
                    : "A liderança ainda não definiu os departamentos deste evento."}
                </p>
              </div>
            </div>
          ) : (
            <ScheduleEditor
              eventId={event.id}
              departments={actingDepartments}
              assignments={assignments}
              currentUserId={session.user.id}
              isAdmin={isAdmin}
              unavailablePeopleMap={unavailablePeopleMap}
            />
          )}
        </TabsContent>
      </Tabs>
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

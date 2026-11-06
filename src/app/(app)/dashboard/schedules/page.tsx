import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClipboardListIcon } from "lucide-react";

import { MemberSchedules } from "@/components/app/member-schedules";
import { ScheduleList } from "@/components/events/schedule-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPersonAssignments,
  splitAssignments,
} from "@/lib/agenda";
import {
  listEvents,
  scheduleProgress,
  splitEvents,
} from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId } from "@/lib/people";

export const metadata: Metadata = {
  title: "Escalas",
};

export default function SchedulesPage() {
  return (
    <Suspense fallback={<SchedulesSkeleton />}>
      <SchedulesContent />
    </Suspense>
  );
}

async function SchedulesContent() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  if (!isAdmin) {
    const person = await findPersonByUserId(
      organization.id,
      session.user.id,
    );
    const assignments = person
      ? await getPersonAssignments(organization.id, person.id)
      : [];
    const { upcoming, past } = splitAssignments(assignments);

    return (
      <MemberSchedules
        organizationName={organization.name}
        upcoming={upcoming}
        past={past}
      />
    );
  }

  const events = await listEvents(organization.id);
  const { upcoming, past } = splitEvents(events);
  const complete = upcoming.filter(
    (event) => scheduleProgress(event).status === "complete",
  ).length;
  const attention = upcoming.length - complete;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Escalas
          </h1>
          <Badge variant="outline" className="font-normal">
            {upcoming.length}
          </Badge>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Quem atua em cada encontro de{" "}
          <span className="font-medium text-foreground">
            {organization.name}
          </span>
          . As escalas já passadas ficam no histórico.
        </p>
        {events.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              {upcoming.length === 1
                ? "1 encontro futuro"
                : `${upcoming.length} encontros futuros`}
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>
              {complete === 1
                ? "1 escala completa"
                : `${complete} escalas completas`}
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>
              {attention === 1
                ? "1 para montar"
                : `${attention} para montar`}
            </span>
          </p>
        ) : null}
      </header>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardListIcon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              Nenhuma escala ainda
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cadastre um culto ou evento e defina os departamentos que atuam.
              A escala de cada ocorrência aparece aqui.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/events">Ver cultos e eventos</Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-2xl tracking-tight">
                Próximas escalas
              </h2>
              <span className="text-xs text-muted-foreground">
                {upcoming.length === 0
                  ? "nenhum encontro futuro"
                  : upcoming.length === 1
                    ? "1 encontro futuro"
                    : `${upcoming.length} encontros futuros`}
              </span>
            </div>

            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-10 text-center">
                <p className="text-sm font-medium">
                  Nenhum encontro futuro
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As próximas escalas aparecem aqui assim que houver um culto
                  ou evento marcado.
                </p>
              </div>
            ) : (
              <ScheduleList events={upcoming} />
            )}
          </section>

          {past.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-heading text-2xl tracking-tight">
                  Já aconteceram
                </h2>
                <span className="text-xs text-muted-foreground">
                  {past.length === 1
                    ? "1 encontro"
                    : `${past.length} encontros`}
                </span>
              </div>
              <ScheduleList events={past.slice(0, 24)} past />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function SchedulesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

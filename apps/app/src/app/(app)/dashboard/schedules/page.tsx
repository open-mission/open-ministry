import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClipboardListIcon } from "lucide-react";

import { MemberSchedules } from "@/components/app/member-schedules";
import { PageInfo } from "@/components/app/page-info";
import { DepartmentCoverageBoard } from "@/components/events/department-coverage";
import { EventFilters } from "@/components/events/event-filters";
import { PastEventsSheet } from "@/components/events/past-events-sheet";
import { ScheduleList } from "@/components/events/schedule-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPersonAssignments,
  splitAssignments,
} from "@/lib/agenda";
import { listDepartments } from "@/lib/departments";
import {
  buildDepartmentCoverage,
  coverageCounts,
  filterEvents,
  listEvents,
  parseCoverageFilter,
  splitEvents,
} from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId } from "@/lib/people";
import { can } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Escalas",
};

type SchedulesSearchParams = {
  coverage?: string;
  department?: string;
  q?: string;
};

export default function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<SchedulesSearchParams>;
}) {
  return (
    <Suspense fallback={<SchedulesSkeleton />}>
      <SchedulesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SchedulesContent({
  searchParams,
}: {
  searchParams: Promise<SchedulesSearchParams>;
}) {
  await connection();

  const params = await searchParams;
  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const hasAccess = await can("schedules", "read");
  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Escalas não disponível
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Escalas não está liberado para sua igreja ou departamento.
          </p>
        </div>
      </div>
    );
  }

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

  const [events, departments] = await Promise.all([
    listEvents(organization.id),
    listDepartments(organization.id),
  ]);
  const { upcoming, past } = splitEvents(events);
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));
  const coverage =
    parseCoverageFilter(params.coverage) ?? ("attention" as const);
  const departmentId =
    typeof params.department === "string" ? params.department : undefined;
  const query = typeof params.q === "string" ? params.q : undefined;
  const counts = coverageCounts(upcoming);
  const filteredUpcoming = filterEvents(upcoming, {
    coverage,
    departmentId,
    query,
  });
  const coverageBoard = buildDepartmentCoverage(upcoming, departmentOptions);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Escalas
          </h1>
          <PageInfo
            title="Escalas"
            triggerLabel="Como funciona"
            description={
              <>
                Acompanhe quem serve em cada encontro de{" "}
                <span className="font-medium text-foreground">
                  {organization.name}
                </span>
                . Cada função é considerada coberta quando tem pelo menos uma
                pessoa escalada. As escalas anteriores ficam no histórico.
              </>
            }
          />
        </div>
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
              Crie um culto ou evento e selecione os departamentos que vão
              atuar. A escala de cada encontro aparece aqui.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/events">Ver cultos e eventos</Link>
          </Button>
        </div>
      ) : (
        <>
          <DepartmentCoverageBoard
            departments={coverageBoard}
            eventsCount={upcoming.length}
          />

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl tracking-tight">
                  Próximas escalas
                </h2>
                <p className="text-xs text-muted-foreground">
                  {upcoming.length === 0
                    ? "nenhum encontro futuro"
                    : filteredUpcoming.length === upcoming.length
                      ? upcoming.length === 1
                        ? "1 encontro futuro"
                        : `${upcoming.length} encontros futuros`
                      : `${filteredUpcoming.length} de ${upcoming.length} encontros`}
                </p>
              </div>

              <PastEventsSheet count={past.length}>
                <ScheduleList events={past} past />
              </PastEventsSheet>
            </div>

            <EventFilters
              coverage={coverage}
              departmentId={departmentId}
              query={query}
              departments={departmentOptions}
              counts={counts}
              searchPlaceholder="Buscar escala por encontro"
            />

            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-10 text-center">
                <p className="text-sm font-medium">
                  Nenhum encontro futuro publicado
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quando um culto ou evento for marcado, as próximas escalas
                  aparecem aqui.
                </p>
              </div>
            ) : filteredUpcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
                <p className="text-sm font-medium">
                  Nenhuma escala com estes filtros
                </p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {coverage === "attention"
                    ? "Todas as escalas dos próximos encontros estão completas."
                    : "Ajuste a busca ou o departamento para ver outras escalas."}
                </p>
                {coverage !== "all" || departmentId || query ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/schedules?coverage=all">
                      Ver todas as escalas
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <ScheduleList events={filteredUpcoming} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SchedulesSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <Skeleton className="h-10 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

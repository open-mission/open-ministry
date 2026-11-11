import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarDaysIcon } from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { EventFilters } from "@/components/events/event-filters";
import { EventList } from "@/components/events/event-list";
import { PastEventsSheet } from "@/components/events/past-events-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments } from "@/lib/departments";
import {
  coverageCounts,
  filterEvents,
  listEvents,
  parseCoverageFilter,
  splitEvents,
  toInputDate,
} from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Cultos e eventos",
};

type EventsSearchParams = {
  coverage?: string;
  department?: string;
  q?: string;
};

export default function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  return (
    <Suspense fallback={<EventsSkeleton />}>
      <EventsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EventsContent({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  await connection();

  const params = await searchParams;
  const { organization, isAdmin } = await requireOrganizationContext();

  const hasAccess = await can("agenda", "read");
  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Agenda não disponível
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Agenda não está liberado para sua igreja ou departamento.
          </p>
        </div>
      </div>
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
  const defaultDate = toInputDate(new Date());

  const allowedDepartments = isAdmin
    ? departmentOptions
    : (
        await Promise.all(
          departmentOptions.map(async (d) => ({
            d,
            allowed: await can("agenda", "createEvent", { departmentId: d.id }),
          })),
        )
      )
        .filter((item) => item.allowed)
        .map((item) => item.d);

  const canCreate = isAdmin || allowedDepartments.length > 0;

  const coverage =
    parseCoverageFilter(params.coverage) ?? (isAdmin ? "attention" : "all");
  const departmentId =
    typeof params.department === "string" ? params.department : undefined;
  const query = typeof params.q === "string" ? params.q : undefined;
  const counts = coverageCounts(upcoming);
  const filteredUpcoming = filterEvents(upcoming, {
    coverage,
    departmentId,
    query,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Cultos e eventos
          </h1>
          <PageInfo
            title="Cultos e eventos"
            triggerLabel="Como funciona"
            description={
              <>
                Aqui você planeja os encontros e monta o cronograma de cada um.
                A cobertura das escalas por departamento fica em{" "}
                <span className="font-medium text-foreground">Escalas</span>.
                Cada ocorrência de uma série tem escala própria.
              </>
            }
          />
        </div>
        {canCreate ? (
          <CreateEventDialog
            departments={allowedDepartments}
            defaultDate={defaultDate}
          />
        ) : null}
      </header>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDaysIcon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              A agenda está em branco
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isAdmin
                ? "Use o botão “Novo culto ou evento” para cadastrar o primeiro encontro, escolher os departamentos que atuam e montar a escala."
                : "Quando a liderança cadastrar os próximos encontros, eles aparecem aqui."}
            </p>
          </div>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl tracking-tight">
                Próximos encontros
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
              <EventList events={past} />
            </PastEventsSheet>
          </div>

          <EventFilters
            coverage={coverage}
            departmentId={departmentId}
            query={query}
            departments={departmentOptions}
            counts={counts}
          />

          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-medium">
                Nenhum encontro futuro publicado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAdmin
                  ? "Crie o próximo culto ou evento para começar a montar a escala."
                  : "A liderança ainda não publicou os próximos encontros."}
              </p>
            </div>
          ) : filteredUpcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-medium">
                Nenhum encontro com estes filtros
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                {coverage === "attention"
                  ? "Todas as escalas dos próximos encontros estão completas."
                  : "Ajuste a busca ou o departamento para ver outros encontros."}
              </p>
              {coverage !== "all" || departmentId || query ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/events?coverage=all">
                    Ver todos os encontros
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <EventList events={filteredUpcoming} />
          )}
        </section>
      )}
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarDaysIcon } from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { EventList } from "@/components/events/event-list";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments } from "@/lib/departments";
import {
  listEvents,
  splitEvents,
  toInputDate,
} from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Cultos e eventos",
};

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsSkeleton />}>
      <EventsContent />
    </Suspense>
  );
}

async function EventsContent() {
  await connection();

  const { organization, isAdmin } = await requireOrganizationContext();
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Cultos e eventos
          </h1>
          <Badge variant="outline" className="font-normal">
            {upcoming.length}
          </Badge>
          <PageInfo
            title="Cultos e eventos"
            description={
              <>
                A agenda de{" "}
                <span className="font-medium text-foreground">
                  {organization.name}
                </span>
                , com os departamentos e a escala de cada ocorrência.
              </>
            }
          />
        </div>
        {isAdmin ? (
          <CreateEventDialog
            departments={departmentOptions}
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
                ? "Cadastre o primeiro culto ou evento, escolha os departamentos que atuam e monte a escala."
                : "Quando a liderança cadastrar os próximos encontros, eles aparecem aqui."}
            </p>
          </div>
          {isAdmin ? (
            <CreateEventDialog
              departments={departmentOptions}
              defaultDate={defaultDate}
            />
          ) : null}
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-2xl tracking-tight">
                Próximos encontros
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
                  Nenhum encontro futuro publicado
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isAdmin
                    ? "Crie o próximo culto ou evento para começar a montar a escala."
                    : "A liderança ainda não publicou os próximos encontros."}
                </p>
              </div>
            ) : (
              <EventList events={upcoming} />
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
              <EventList events={past.slice(0, 24)} />
            </section>
          ) : null}
        </>
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
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

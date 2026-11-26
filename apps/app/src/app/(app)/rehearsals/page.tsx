import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { DomainSubtabs } from "@/components/app/domain-subtabs-server";
import {
  CalendarClockIcon,
  ChevronRightIcon,
  MapPinIcon,
  Music2Icon,
  UsersIcon,
} from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatRehearsalFullDate,
  formatRehearsalTimeRange,
  rehearsalDateParts,
  rehearsalSongCountLabel,
  splitRehearsals,
} from "@/features/rehearsals/lib/rehearsal-ui";
import {
  getAccessibleRehearsalDepartments,
  listAccessibleRehearsals,
} from "@/features/rehearsals/services/rehearsals-service";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ensaios",
};

type RehearsalsSearchParams = {
  departmentId?: string;
};

type RehearsalRow = Awaited<
  ReturnType<typeof listAccessibleRehearsals>
>[number];

type RehearsalDepartment = Awaited<
  ReturnType<typeof getAccessibleRehearsalDepartments>
>[number];

export default function RehearsalsPage({
  searchParams,
}: {
  searchParams: Promise<RehearsalsSearchParams>;
}) {
  return (
    <Suspense fallback={<RehearsalsSkeleton />}>
      <RehearsalsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RehearsalsContent({
  searchParams,
}: {
  searchParams: Promise<RehearsalsSearchParams>;
}) {
  await connection();

  const params = await searchParams;
  const { organization } = await requireOrganizationContext();

  const hasAccess = await can("rehearsals", "read");
  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Ensaios não disponível
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Ensaios não está liberado para sua igreja ou
            departamento.
          </p>
        </div>
      </div>
    );
  }

  const departments = await getAccessibleRehearsalDepartments(
    organization.id,
  );

  if (departments.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 min-w-0">
        <RehearsalsHeader />
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Music2Icon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              Nenhum departamento com Ensaios ativo
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ative o módulo Ensaios em um departamento e conceda a permissão de
              leitura para que os ensaios apareçam aqui.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const requestedDepartmentId =
    typeof params.departmentId === "string" ? params.departmentId : undefined;
  const selectedDepartment = departments.find(
    (department) => department.id === requestedDepartmentId,
  );
  const departmentIds = selectedDepartment
    ? [selectedDepartment.id]
    : departments.map((department) => department.id);

  const rehearsals = await listAccessibleRehearsals(
    organization.id,
    departmentIds,
  );
  const { upcoming, past } = splitRehearsals(rehearsals);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 min-w-0">
      <DomainSubtabs domain="louvor" />
      <RehearsalsHeader />

      {departments.length > 1 ? (
        <DepartmentFilter
          departments={departments}
          selectedDepartmentId={selectedDepartment?.id}
        />
      ) : null}

      {rehearsals.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <CalendarClockIcon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              {selectedDepartment
                ? "Nenhum ensaio neste departamento"
                : "Nenhum ensaio agendado"}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {selectedDepartment
                ? `Ainda não há ensaios agendados para ${selectedDepartment.name}.`
                : "Quando a liderança agendar um ensaio, ele aparece aqui com data, local e repertório."}
            </p>
          </div>
          {selectedDepartment ? (
            <Button asChild variant="outline" size="sm" className="min-h-9">
              <Link href="/rehearsals">Ver todos os ensaios</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          <RehearsalGroup
            title="Próximos"
            rehearsals={upcoming}
            emptyLabel="Nenhum ensaio futuro agendado."
          />

          {past.length > 0 ? (
            <RehearsalGroup
              title="Realizados"
              rehearsals={past}
              emptyLabel="Nenhum ensaio realizado ainda."
              past
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function RehearsalsHeader() {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Ensaios
        </h1>
        <PageInfo
          title="Ensaios"
          triggerLabel="Como funciona"
          description={
            <>
              Acompanhe todos os ensaios dos departamentos com o módulo Ensaios
              ativo. Use o filtro para ver um departamento específico e abra um
              ensaio para acessar o repertório e os detalhes.
            </>
          }
        />
      </div>
    </header>
  );
}

function DepartmentFilter({
  departments,
  selectedDepartmentId,
}: {
  departments: RehearsalDepartment[];
  selectedDepartmentId?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar ensaios por departamento"
      className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-card/60 p-1"
    >
      <DepartmentFilterLink
        href="/rehearsals"
        active={!selectedDepartmentId}
      >
        Todos os departamentos
      </DepartmentFilterLink>
      {departments.map((department) => (
        <DepartmentFilterLink
          key={department.id}
          href={`/rehearsals?departmentId=${encodeURIComponent(department.id)}`}
          active={selectedDepartmentId === department.id}
        >
          {department.name}
        </DepartmentFilterLink>
      ))}
    </div>
  );
}

function DepartmentFilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center rounded-md px-3 text-[0.8125rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm",
        active
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function RehearsalGroup({
  title,
  rehearsals,
  emptyLabel,
  past = false,
}: {
  title: string;
  rehearsals: RehearsalRow[];
  emptyLabel: string;
  past?: boolean;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl tracking-tight">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {rehearsals.length === 1
            ? "1 ensaio"
            : `${rehearsals.length} ensaios`}
        </span>
      </div>

      {rehearsals.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {rehearsals.map((rehearsal) => (
            <RehearsalCard
              key={rehearsal.id}
              rehearsal={rehearsal}
              past={past}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RehearsalCard({
  rehearsal,
  past,
}: {
  rehearsal: RehearsalRow;
  past: boolean;
}) {
  const parts = rehearsalDateParts(rehearsal.startsAt);
  const songTitles = rehearsal.songs
    .map((entry) => entry.song?.title)
    .filter((songTitle): songTitle is string => Boolean(songTitle));
  const visibleTitles = songTitles.slice(0, 3);
  const remaining = songTitles.length - visibleTitles.length;
  const departmentNames = rehearsal.departments.map(
    (department) => department.name,
  );

  return (
    <li>
      <Link
        href={`/events/${rehearsal.id}`}
        prefetch={true}
        className={cn(
          "group flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-violet-500/40 active:bg-muted/40 sm:flex-row sm:items-start sm:p-4",
          past ? "opacity-80" : null,
        )}
      >
        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300 sm:size-14">
          <span className="font-heading text-xl leading-none sm:text-2xl">
            {parts.day}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold tracking-[0.14em]">
            {parts.monthShort}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-heading text-base leading-tight tracking-tight sm:text-lg">
              {rehearsal.title}
            </span>
            <Badge
              variant="outline"
              className="gap-1 border-violet-500/30 bg-violet-500/10 font-normal text-violet-700 dark:text-violet-300"
            >
              <Music2Icon className="size-3" />
              {rehearsalSongCountLabel(rehearsal.songs.length)}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {parts.weekday} · {formatRehearsalFullDate(rehearsal.startsAt)} ·{" "}
            {formatRehearsalTimeRange(rehearsal.startsAt, rehearsal.endsAt)}
          </p>

          {departmentNames.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <UsersIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{departmentNames.join(", ")}</span>
            </p>
          ) : null}

          {rehearsal.location ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{rehearsal.location}</span>
            </p>
          ) : null}

          {visibleTitles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {visibleTitles.map((songTitle, index) => (
                <span
                  key={`${songTitle}-${index}`}
                  className="max-w-[14rem] truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {songTitle}
                </span>
              ))}
              {remaining > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  +{remaining}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <ChevronRightIcon className="hidden size-4 shrink-0 self-center text-muted-foreground/50 transition-colors group-hover:text-primary sm:block" />
      </Link>
    </li>
  );
}

function RehearsalsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-full max-w-xl rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

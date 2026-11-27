"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ClipboardListIcon,
  ExternalLinkIcon,
  ShieldAlertIcon,
} from "lucide-react";

import { getSchedulesPanelDataAction, type SchedulesPanelData } from "@/app/actions/schedules";
import { MemberSchedules } from "@/components/app/member-schedules";
import { DepartmentCoverageBoard } from "@/components/events/department-coverage";
import { EventFilters } from "@/components/events/event-filters";
import { PastEventsSheet } from "@/components/events/past-events-sheet";
import { ScheduleList } from "@/components/events/schedule-list";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CoverageFilter } from "@/lib/events";
import { coverageCounts, filterEvents } from "@/lib/events-pure";
import { cn } from "@/lib/utils";

type SchedulesPanelProps = {
  /** Resultado de `can("schedules","read")` no servidor. */
  canViewSchedules: boolean;
  /** Modo controlado: o painel é aberto por outro controle (ex.: menu "…"). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Esconde o botão "Ver escalas" quando outro controle abre o painel. */
  hideTrigger?: boolean;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: SchedulesPanelData }
  | { status: "denied" }
  | { status: "error" };

function PanelContent({ data }: { data: SchedulesPanelData }) {
  const [coverage, setCoverage] = useState<CoverageFilter>("attention");
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [query, setQuery] = useState<string | undefined>();

  if (data.role === "member") {
    return (
      <MemberSchedules
        organizationName={data.organizationName}
        upcoming={data.upcoming}
        past={data.past}
      />
    );
  }

  const counts = coverageCounts(data.upcoming);
  const filtered = filterEvents(data.upcoming, {
    coverage,
    departmentId,
    query,
  });

  return (
    <div className="flex flex-col gap-6">
      {data.coverageBoard.length > 0 ? (
        <DepartmentCoverageBoard
          departments={data.coverageBoard}
          eventsCount={data.upcoming.length}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-xl tracking-tight">
              Próximas escalas
            </h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length === data.upcoming.length
                ? `${data.upcoming.length} ${data.upcoming.length === 1 ? "encontro futuro" : "encontros futuros"}`
                : `${filtered.length} de ${data.upcoming.length} encontros`}
            </p>
          </div>
          <PastEventsSheet count={data.past.length}>
            <ScheduleList events={data.past} past />
          </PastEventsSheet>
        </div>

        <EventFilters
          coverage={coverage}
          departmentId={departmentId}
          query={query}
          departments={data.departments}
          counts={counts}
          searchPlaceholder="Buscar escala por encontro"
        />

        {data.upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum encontro futuro publicado.
          </p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm font-medium">Nenhuma escala com estes filtros</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCoverage("all");
                setDepartmentId(undefined);
                setQuery(undefined);
              }}
            >
              Ver todas as escalas
            </Button>
          </div>
        ) : (
          <ScheduleList events={filtered} />
        )}
      </section>
    </div>
  );
}

function PanelBody({ state }: { state: LoadState }) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-9 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (state.status === "denied") {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldAlertIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Escalas não disponíveis</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Você não tem permissão para consultar as escalas desta igreja.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm font-medium">Não foi possível carregar as escalas</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Tente fechar e abrir o painel novamente.
        </p>
      </div>
    );
  }

  return <PanelContent data={state.data} />;
}

/**
 * Botão "Ver escalas" da agenda. No desktop abre um Sheet lateral com pelo
 * menos metade da largura da tela; no mobile, um Drawer independente.
 */
export function SchedulesPanel({
  canViewSchedules,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: SchedulesPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const isMobile = useIsMobile();

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
      if (!nextOpen || !canViewSchedules) return;

      setState((previous) =>
        previous.status === "ready" || previous.status === "loading"
          ? previous
          : { status: "loading" },
      );

      getSchedulesPanelDataAction()
        .then((data) => {
          setState(data ? { status: "ready", data } : { status: "denied" });
        })
        .catch(() => {
          setState({ status: "error" });
        });
    },
    [canViewSchedules, onOpenChange],
  );

  if (!canViewSchedules) return null;

  const trigger = hideTrigger ? null : (
    <Button
      type="button"
      variant="outline"
      aria-label="Ver escalas"
      className={cn(
        "gap-1.5 rounded-xl bg-card text-xs font-semibold sm:gap-2",
        isMobile ? "h-11 px-2.5 sm:px-3" : "h-9 px-3",
      )}
      onClick={() => handleOpenChange(true)}
    >
      <ClipboardListIcon className="size-4 text-primary" aria-hidden="true" />
      <span className="sm:hidden">Escalas</span>
      <span className="hidden sm:inline">Ver escalas</span>
    </Button>
  );

  const fullPageLink = (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
      <Link href="/schedules">
        Abrir página completa
        <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
      </Link>
    </Button>
  );

  const renderHeader = (Title: typeof DrawerTitle | typeof SheetTitle) => (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardListIcon className="size-5 text-primary" aria-hidden="true" />
        <Title className="font-heading text-xl font-bold tracking-tight">
          Escalas
        </Title>
      </div>
      {fullPageLink}
    </>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl border-x-0 border-b-0 bg-popover p-0">
            <DrawerHeader className="flex flex-col gap-2 border-b px-5 pt-4 pb-3 text-left">
              {renderHeader(DrawerTitle)}
              <DrawerDescription className="text-xs text-muted-foreground">
                Acompanhe a cobertura e o histórico das escalas.
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <PanelBody state={state} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full min-w-0 flex-col gap-0 p-0 data-[side=right]:md:w-1/2! data-[side=right]:md:max-w-[50vw]!"
        >
          <SheetHeader className="flex flex-col gap-2 border-b bg-card/50 px-6 py-4 pr-12 text-left">
            {renderHeader(SheetTitle)}
            <SheetDescription className="text-xs text-muted-foreground">
              Acompanhe a cobertura e o histórico das escalas sem sair da agenda.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <PanelBody state={state} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  DownloadIcon,
  FilterIcon,
  Link2Icon,
  MoreHorizontalIcon,
  Music2Icon,
  PlusIcon,
} from "lucide-react";

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { SchedulesPanel } from "@/components/calendar/schedules-panel";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { CalendarSyncCard } from "@/components/settings/calendar-sync-card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listCalendarFeedsAction } from "@/features/calendar/actions/feed.actions";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarFeedView } from "@/lib/calendar-feed-data";
import type { DepartmentOption } from "@/lib/departments";

type CreateKind = "service" | "event";
type MobileMoreTab = "menu" | "filters";

type CalendarActionsProps = {
  departments: DepartmentOption[];
  defaultDate: string;
  canCreateEvent: boolean;
  canCreateRehearsal: boolean;
  canViewSchedules?: boolean;
  onExport: () => void;
  variant?: "mobile" | "desktop";
  activeFilterCount?: number;
  filterContent?: ReactNode;
  onResetFilters?: () => void;
};

function toFeedViews(
  feeds: Awaited<ReturnType<typeof listCalendarFeedsAction>>,
): CalendarFeedView[] {
  if (!feeds.ok) return [];
  return feeds.feeds.map((feed) => ({
    id: feed.id,
    label: feed.label,
    includeServices: feed.includeServices,
    includeRehearsals: feed.includeRehearsals,
    includeDepartmentEvents: feed.includeDepartmentEvents,
    includeAssignments: feed.includeAssignments,
    lastUsedAt: feed.lastUsedAt ? feed.lastUsedAt.toISOString() : null,
    createdAt: feed.createdAt.toISOString(),
  }));
}

export function CalendarActions({
  departments,
  defaultDate,
  canCreateEvent,
  canCreateRehearsal,
  canViewSchedules = false,
  onExport,
  variant = "desktop",
  activeFilterCount = 0,
  filterContent,
  onResetFilters,
}: CalendarActionsProps) {
  const isMobile = useIsMobile();
  const [newOpen, setNewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMoreTab, setMobileMoreTab] = useState<MobileMoreTab>("menu");
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncFeeds, setSyncFeeds] = useState<CalendarFeedView[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);

  useEffect(() => {
    if (!syncOpen) return;
    let active = true;
    listCalendarFeedsAction()
      .then((result) => {
        if (!active) return;
        setSyncFeeds(toFeedViews(result));
        setSyncLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSyncFeeds([]);
        setSyncLoading(false);
      });
    return () => {
      active = false;
    };
  }, [syncOpen]);

  function openCreate(kind: CreateKind) {
    setNewOpen(false);
    setCreateKind(kind);
  }

  function openSync() {
    setMoreOpen(false);
    setSyncLoading(true);
    setSyncOpen(true);
  }

  function handleExport() {
    setMoreOpen(false);
    onExport();
  }

  function handleOpenSchedules() {
    setMoreOpen(false);
    setSchedulesOpen(true);
  }

  function handleMoreOpenChange(nextOpen: boolean) {
    setMoreOpen(nextOpen);
    if (!nextOpen) {
      setMobileMoreTab("menu");
    }
  }

  const newTrigger = (
    <Button
      size={variant === "mobile" ? "icon" : "sm"}
      className={
        variant === "mobile"
          ? "size-11 rounded-xl shadow-xs"
          : "h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs sm:text-sm"
      }
      aria-label="Novo compromisso"
    >
      <PlusIcon className="size-4" aria-hidden="true" />
      {variant === "mobile" ? null : <span>Novo</span>}
    </Button>
  );

  const moreTrigger = (
    <Button
      size="icon"
      variant={variant === "mobile" ? "outline" : "default"}
      className={
        variant === "mobile"
          ? "relative size-11 rounded-xl bg-card"
          : "size-9 rounded-xl"
      }
      aria-label={
        variant === "mobile" ? "Mais ações e filtros" : "Mais ações da agenda"
      }
    >
      {variant === "mobile" ? (
        <>
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
          {activeFilterCount > 0 ? (
            <span className="absolute -top-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold leading-none tabular-nums text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </>
      ) : (
        <ChevronDownIcon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );

  const newOptions = (
    <div className="flex flex-col gap-1">
      {canCreateEvent ? (
        <>
          <button
            type="button"
            onClick={() => openCreate("service")}
            className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <CalendarPlusIcon className="size-4 text-primary" aria-hidden="true" />
            Novo culto
          </button>
          <button
            type="button"
            onClick={() => openCreate("event")}
            className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <CalendarPlusIcon className="size-4 text-primary" aria-hidden="true" />
            Novo evento
          </button>
        </>
      ) : null}
      {canCreateRehearsal ? (
        <Link
          href="/dashboard/rehearsals"
          onClick={() => setNewOpen(false)}
          className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <Music2Icon className="size-4 text-violet-600" aria-hidden="true" />
          Novo ensaio
        </Link>
      ) : null}
      {!canCreateEvent && !canCreateRehearsal ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Você não tem permissão para criar compromissos.
        </p>
      ) : null}
    </div>
  );

  const moreOptions = (
    <div className="flex flex-col gap-1">
      {variant === "mobile" && filterContent ? (
        <button
          type="button"
          onClick={() => setMobileMoreTab("filters")}
          className="flex min-h-11 items-center justify-between gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <span className="flex items-center gap-2.5">
            <FilterIcon className="size-4 text-primary" aria-hidden="true" />
            <span>Filtrar compromissos</span>
          </span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 font-mono text-[11px] font-semibold tabular-nums text-primary">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      ) : null}
      {variant === "mobile" && canViewSchedules ? (
        <button
          type="button"
          onClick={handleOpenSchedules}
          className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <ClipboardListIcon className="size-4 text-primary" aria-hidden="true" />
          <span>Ver escalas</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleExport}
        className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <DownloadIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>
          Exportar<span className="font-mono">.ics</span>
        </span>
      </button>
      <button
        type="button"
        onClick={openSync}
        className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <Link2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        Conectar meu calendário
      </button>
    </div>
  );

  const actionGroup =
    variant === "mobile" ? (
      <div className="flex shrink-0 items-center gap-2" aria-label="Ações da agenda">
        <ResponsiveDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          trigger={newTrigger}
          title="Novo compromisso"
          description="Escolha o que deseja criar."
        >
          {newOptions}
        </ResponsiveDialog>

        <Drawer open={moreOpen} onOpenChange={handleMoreOpenChange}>
          <DrawerTrigger asChild>{moreTrigger}</DrawerTrigger>
          <DrawerContent className="gap-0 rounded-t-xl border-x-0 border-b-0 bg-popover p-0">
            <DrawerHeader className="space-y-1 px-5 pt-3 pb-3 !text-left">
              {mobileMoreTab === "filters" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Voltar para mais ações"
                    onClick={() => setMobileMoreTab("menu")}
                    className="-ml-2 size-11 shrink-0 rounded-xl"
                  >
                    <ArrowLeftIcon className="size-4" aria-hidden="true" />
                  </Button>
                  <div className="min-w-0">
                    <DrawerTitle className="font-heading text-xl tracking-tight text-foreground">
                      Filtrar agenda
                    </DrawerTitle>
                    <DrawerDescription className="text-xs text-muted-foreground">
                      Escolha o tipo de compromisso ou departamento.
                    </DrawerDescription>
                  </div>
                </div>
              ) : (
                <>
                  <DrawerTitle className="font-heading text-xl tracking-tight text-foreground">
                    Mais ações
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">
                    Filtre compromissos, veja escalas ou conecte seu calendário.
                  </DrawerDescription>
                </>
              )}
            </DrawerHeader>

            <div className="max-h-[62dvh] overflow-y-auto px-5 pb-4">
              {mobileMoreTab === "filters" && filterContent
                ? filterContent
                : moreOptions}
            </div>

            {mobileMoreTab === "filters" ? (
              <DrawerFooter className="border-t bg-card px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {activeFilterCount > 0 && onResetFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onResetFilters}
                    className="h-11 w-full rounded-xl"
                  >
                    Limpar filtros
                  </Button>
                ) : null}
                <DrawerClose asChild>
                  <Button className="h-11 w-full rounded-xl font-semibold">
                    Aplicar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            ) : null}
          </DrawerContent>
        </Drawer>
      </div>
    ) : (
      <ButtonGroup aria-label="Ações da agenda">
        {isMobile ? (
          <>
            <ResponsiveDialog
              open={newOpen}
              onOpenChange={setNewOpen}
              trigger={newTrigger}
              title="Novo compromisso"
              description="Escolha o que deseja criar."
            >
              {newOptions}
            </ResponsiveDialog>
            <ResponsiveDialog
              open={moreOpen}
              onOpenChange={handleMoreOpenChange}
              trigger={moreTrigger}
              title="Mais ações"
              description="Exporte sua agenda ou conecte-a ao seu calendário."
            >
              {moreOptions}
            </ResponsiveDialog>
          </>
        ) : (
          <>
            <DropdownMenu open={newOpen} onOpenChange={setNewOpen}>
              <DropdownMenuTrigger asChild>{newTrigger}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Criar</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canCreateEvent ? (
                  <>
                    <DropdownMenuItem onSelect={() => openCreate("service")}>
                      <CalendarPlusIcon aria-hidden="true" />
                      Novo culto
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openCreate("event")}>
                      <CalendarPlusIcon aria-hidden="true" />
                      Novo evento
                    </DropdownMenuItem>
                  </>
                ) : null}
                {canCreateRehearsal ? (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/rehearsals">
                      <Music2Icon aria-hidden="true" />
                      Novo ensaio
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {!canCreateEvent && !canCreateRehearsal ? (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Sem permissão para criar.
                  </p>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={moreOpen} onOpenChange={handleMoreOpenChange}>
              <DropdownMenuTrigger asChild>{moreTrigger}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Agenda</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleExport}>
                  <DownloadIcon aria-hidden="true" />
                  Exportar <span className="font-mono">.ics</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openSync}>
                  <Link2Icon aria-hidden="true" />
                  Conectar meu calendário
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </ButtonGroup>
    );

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {variant === "mobile" ? (
          <>
            {actionGroup}
            <SchedulesPanel
              canViewSchedules={canViewSchedules}
              open={schedulesOpen}
              onOpenChange={setSchedulesOpen}
              hideTrigger
            />
          </>
        ) : (
          <>
            {actionGroup}
            <SchedulesPanel canViewSchedules={canViewSchedules} />
          </>
        )}
      </div>

      <CreateEventDialog
        departments={departments}
        defaultDate={defaultDate}
        defaultKind={createKind ?? "service"}
        trigger={null}
        open={createKind !== null}
        onOpenChange={(open) => {
          if (!open) setCreateKind(null);
        }}
      />

      <ResponsiveDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        title="Conectar meu calendário"
        description="Inscreva sua agenda no Apple Calendar, Google Calendar ou Outlook."
        contentClassName="sm:max-w-2xl"
      >
        {syncLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Carregando seus links…
          </p>
        ) : (
          <CalendarSyncCard feeds={syncFeeds} />
        )}
      </ResponsiveDialog>
    </>
  );
}

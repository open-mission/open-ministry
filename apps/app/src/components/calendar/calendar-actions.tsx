"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  DownloadIcon,
  FilterIcon,
  Link2Icon,
  MoreVerticalIcon,
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

type CalendarActionsContextValue = {
  variant: "mobile" | "desktop";
  isMobile: boolean;
  canCreateEvent: boolean;
  canCreateRehearsal: boolean;
  canViewSchedules: boolean;
  activeFilterCount: number;
  filterContent?: ReactNode;
  onResetFilters?: () => void;
  newOpen: boolean;
  setNewOpen: (open: boolean) => void;
  moreOpen: boolean;
  handleMoreOpenChange: (open: boolean) => void;
  mobileMoreTab: MobileMoreTab;
  setMobileMoreTab: (tab: MobileMoreTab) => void;
  openCreate: (kind: CreateKind) => void;
  openSync: () => void;
  handleExport: () => void;
  handleOpenSchedules: () => void;
};

const CalendarActionsContext =
  createContext<CalendarActionsContextValue | null>(null);

function useCalendarActionsContext() {
  const ctx = useContext(CalendarActionsContext);
  if (!ctx) {
    throw new Error(
      "CalendarActions triggers devem ser usados dentro de CalendarActionsProvider.",
    );
  }
  return ctx;
}

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

function CreateOptionsList({
  canCreateEvent,
  canCreateRehearsal,
  onSelectKind,
  onClose,
}: {
  canCreateEvent: boolean;
  canCreateRehearsal: boolean;
  onSelectKind: (kind: CreateKind) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {canCreateEvent ? (
        <>
          <button
            type="button"
            onClick={() => onSelectKind("service")}
            className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <CalendarPlusIcon className="size-4 text-primary" aria-hidden="true" />
            Novo culto
          </button>
          <button
            type="button"
            onClick={() => onSelectKind("event")}
            className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <CalendarPlusIcon className="size-4 text-primary" aria-hidden="true" />
            Novo evento
          </button>
        </>
      ) : null}
      {canCreateRehearsal ? (
        <Link
          href="/rehearsals"
          onClick={onClose}
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
}

function MoreOptionsList({
  variant,
  canViewSchedules,
  activeFilterCount,
  hasFilterContent,
  onOpenFilters,
  onOpenSchedules,
  onExport,
  onOpenSync,
}: {
  variant: "mobile" | "desktop";
  canViewSchedules: boolean;
  activeFilterCount: number;
  hasFilterContent: boolean;
  onOpenFilters: () => void;
  onOpenSchedules: () => void;
  onExport: () => void;
  onOpenSync: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {variant === "mobile" && hasFilterContent ? (
        <button
          type="button"
          onClick={onOpenFilters}
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
          onClick={onOpenSchedules}
          className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <ClipboardListIcon className="size-4 text-primary" aria-hidden="true" />
          <span>Ver escalas</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={onExport}
        className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <DownloadIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>
          Exportar<span className="font-mono">.ics</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onOpenSync}
        className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <Link2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        Conectar meu calendário
      </button>
    </div>
  );
}

export function CalendarActionsProvider({
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
  children,
}: CalendarActionsProps & { children: ReactNode }) {
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

  return (
    <CalendarActionsContext.Provider
      value={{
        variant,
        isMobile,
        canCreateEvent,
        canCreateRehearsal,
        canViewSchedules,
        activeFilterCount,
        filterContent,
        onResetFilters,
        newOpen,
        setNewOpen,
        moreOpen,
        handleMoreOpenChange,
        mobileMoreTab,
        setMobileMoreTab,
        openCreate,
        openSync,
        handleExport,
        handleOpenSchedules,
      }}
    >
      {children}

      {variant === "mobile" ? (
        <SchedulesPanel
          canViewSchedules={canViewSchedules}
          open={schedulesOpen}
          onOpenChange={setSchedulesOpen}
          hideTrigger
        />
      ) : null}

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
    </CalendarActionsContext.Provider>
  );
}

/** Botão `+` (Novo compromisso) para o topo da Agenda mobile. */
export function CalendarMobileCreateTrigger() {
  const {
    newOpen,
    setNewOpen,
    canCreateEvent,
    canCreateRehearsal,
    openCreate,
  } = useCalendarActionsContext();

  const trigger = (
    <Button
      size="icon"
      className="relative size-8 rounded-xl shadow-xs after:absolute after:-inset-1.5 after:content-[''] sm:size-9 sm:after:-inset-1"
      aria-label="Novo compromisso"
    >
      <PlusIcon className="size-4" aria-hidden="true" />
    </Button>
  );

  return (
    <ResponsiveDialog
      open={newOpen}
      onOpenChange={setNewOpen}
      trigger={trigger}
      title="Novo compromisso"
      description="Escolha o que deseja criar."
    >
      <CreateOptionsList
        canCreateEvent={canCreateEvent}
        canCreateRehearsal={canCreateRehearsal}
        onSelectKind={openCreate}
        onClose={() => setNewOpen(false)}
      />
    </ResponsiveDialog>
  );
}

/** Botão `⋮` sem borda (Mais ações e filtros) para ficar ao lado do `< Hoje >` no mobile. */
export function CalendarMobileMoreTrigger() {
  const {
    moreOpen,
    handleMoreOpenChange,
    mobileMoreTab,
    setMobileMoreTab,
    activeFilterCount,
    filterContent,
    onResetFilters,
    canViewSchedules,
    handleOpenSchedules,
    handleExport,
    openSync,
  } = useCalendarActionsContext();

  const trigger = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="relative size-9 rounded-xl border-0 bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"
      aria-label="Mais ações e filtros"
    >
      <MoreVerticalIcon className="size-4" aria-hidden="true" />
      {activeFilterCount > 0 ? (
        <span className="absolute top-1 right-1 inline-flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold leading-none tabular-nums text-primary-foreground">
          {activeFilterCount}
        </span>
      ) : null}
    </Button>
  );

  return (
    <Drawer open={moreOpen} onOpenChange={handleMoreOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
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
          {mobileMoreTab === "filters" && filterContent ? (
            filterContent
          ) : (
            <MoreOptionsList
              variant="mobile"
              canViewSchedules={canViewSchedules}
              activeFilterCount={activeFilterCount}
              hasFilterContent={Boolean(filterContent)}
              onOpenFilters={() => setMobileMoreTab("filters")}
              onOpenSchedules={handleOpenSchedules}
              onExport={handleExport}
              onOpenSync={openSync}
            />
          )}
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
  );
}

function DesktopCalendarActionsGroup() {
  const {
    isMobile,
    canCreateEvent,
    canCreateRehearsal,
    canViewSchedules,
    activeFilterCount,
    filterContent,
    newOpen,
    setNewOpen,
    moreOpen,
    handleMoreOpenChange,
    setMobileMoreTab,
    openCreate,
    handleOpenSchedules,
    handleExport,
    openSync,
  } = useCalendarActionsContext();

  const newTrigger = (
    <Button
      size="sm"
      className="h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs sm:text-sm"
      aria-label="Novo compromisso"
    >
      <PlusIcon className="size-4" aria-hidden="true" />
      <span>Novo</span>
    </Button>
  );

  const moreTrigger = (
    <Button size="icon" className="size-9 rounded-xl" aria-label="Mais ações da agenda">
      <ChevronDownIcon className="size-4" aria-hidden="true" />
    </Button>
  );

  return (
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
            <CreateOptionsList
              canCreateEvent={canCreateEvent}
              canCreateRehearsal={canCreateRehearsal}
              onSelectKind={openCreate}
              onClose={() => setNewOpen(false)}
            />
          </ResponsiveDialog>
          <ResponsiveDialog
            open={moreOpen}
            onOpenChange={handleMoreOpenChange}
            trigger={moreTrigger}
            title="Mais ações"
            description="Exporte sua agenda ou conecte-a ao seu calendário."
          >
            <MoreOptionsList
              variant="desktop"
              canViewSchedules={canViewSchedules}
              activeFilterCount={activeFilterCount}
              hasFilterContent={Boolean(filterContent)}
              onOpenFilters={() => setMobileMoreTab("filters")}
              onOpenSchedules={handleOpenSchedules}
              onExport={handleExport}
              onOpenSync={openSync}
            />
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
                  <Link href="/rehearsals">
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
}

export function CalendarActions(props: CalendarActionsProps) {
  if (props.variant === "mobile") {
    return (
      <CalendarActionsProvider {...props}>
        <div className="flex shrink-0 items-center gap-1.5">
          <CalendarMobileCreateTrigger />
          <CalendarMobileMoreTrigger />
        </div>
      </CalendarActionsProvider>
    );
  }

  return (
    <CalendarActionsProvider {...props}>
      <div className="flex shrink-0 items-center gap-2">
        <DesktopCalendarActionsGroup />
        <SchedulesPanel canViewSchedules={Boolean(props.canViewSchedules)} />
      </div>
    </CalendarActionsProvider>
  );
}

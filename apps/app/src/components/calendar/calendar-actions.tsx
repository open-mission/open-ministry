"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarPlusIcon,
  ChevronDownIcon,
  DownloadIcon,
  Link2Icon,
  Music2Icon,
  PlusIcon,
} from "lucide-react";

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { CalendarSyncCard } from "@/components/settings/calendar-sync-card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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

type CalendarActionsProps = {
  departments: DepartmentOption[];
  defaultDate: string;
  canCreateEvent: boolean;
  canCreateRehearsal: boolean;
  onExport: () => void;
  variant?: "mobile" | "desktop";
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
  onExport,
  variant = "desktop",
}: CalendarActionsProps) {
  const isMobile = useIsMobile();
  const [newOpen, setNewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
      className={variant === "mobile" ? "size-11 rounded-xl" : "size-9 rounded-xl"}
      aria-label="Mais ações da agenda"
    >
      <ChevronDownIcon className="size-4" aria-hidden="true" />
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

  return (
    <>
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
              onOpenChange={setMoreOpen}
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

            <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
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

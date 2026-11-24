"use client";

import { useState, type ReactNode } from "react";
import { ArrowRightIcon, CalendarCheckIcon, CalendarClockIcon } from "lucide-react";

import {
  AvailabilitySheet,
  useAvailabilityPanelData,
  type AvailabilityPanelData,
} from "@/components/availability/availability-sheet";
import { CreateDepartmentDialog } from "@/components/departments/create-department-dialog";
import { Button } from "@/components/ui/button";
import type { MyAvailabilityResult } from "@/lib/availability";
import { cn } from "@/lib/utils";

type AvailabilityReminderWidgetProps = {
  hasSaved: boolean;
  canManageAvailability: boolean;
  variant?: "home" | "departments" | "desktop-pill";
  initialPanelData?: AvailabilityPanelData | null;
  onConfigureClick?: () => void;
  onSaved?: (updatedAt: Date) => void;
  className?: string;
};

/**
 * Widget minimalista exibido na Home e em Departamentos enquanto o usuário
 * ainda não salvou sua disponibilidade semanal ("do dia a dia").
 */
export function AvailabilityReminderWidget({
  hasSaved,
  canManageAvailability,
  variant = "home",
  initialPanelData = null,
  onConfigureClick,
  onSaved,
  className,
}: AvailabilityReminderWidgetProps) {
  const [open, setOpen] = useState(false);
  const [localSaved, setLocalSaved] = useState(hasSaved);
  const panel = useAvailabilityPanelData(initialPanelData);

  const effectiveSaved = hasSaved || localSaved;
  if (!canManageAvailability || effectiveSaved) {
    return null;
  }

  const isHome = variant === "home";
  const isDesktopPill = variant === "desktop-pill";
  const title = isHome
    ? "Disponibilidade do dia a dia pendente"
    : "Sua disponibilidade semanal ainda não foi configurada";
  const description = isHome
    ? "Informe seus dias e períodos para facilitar as escalas."
    : "Informe em quais dias e períodos costuma estar livre para servir.";
  const ctaLabel = isHome ? "Configurar" : "Configurar agora";

  const handleOpen = () => {
    if (onConfigureClick) {
      onConfigureClick();
      return;
    }
    setOpen(true);
    panel.ensureLoaded();
  };

  if (isDesktopPill) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Configurar disponibilidade pendente"
          className={cn(
            "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            className,
          )}
        >
          <CalendarCheckIcon
            className="size-3.5 text-primary"
            aria-hidden="true"
          />
          Disponibilidade pendente · Configurar
          <span aria-hidden="true">→</span>
        </button>

        {!onConfigureClick ? (
          <AvailabilitySheet
            open={open}
            onOpenChange={setOpen}
            data={panel.data}
            loading={panel.loading}
            error={panel.error}
            onRetry={panel.reload}
            onSaved={(updatedAt) => {
              panel.markSaved(updatedAt);
              setLocalSaved(true);
              onSaved?.(updatedAt);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <section
        aria-label="Aviso de disponibilidade semanal"
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"
            aria-hidden="true"
          >
            {isHome ? (
              <CalendarCheckIcon className="size-4" />
            ) : (
              <CalendarClockIcon className="size-4" />
            )}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium leading-snug text-foreground">
              {title}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleOpen}
          className="min-h-11 w-full shrink-0 gap-1.5 text-primary sm:w-auto lg:min-h-9"
        >
          {ctaLabel}
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Button>
      </section>

      {!onConfigureClick ? (
        <AvailabilitySheet
          open={open}
          onOpenChange={setOpen}
          data={panel.data}
          loading={panel.loading}
          error={panel.error}
          onRetry={panel.reload}
          onSaved={(updatedAt) => {
            panel.markSaved(updatedAt);
            setLocalSaved(true);
            onSaved?.(updatedAt);
          }}
        />
      ) : null}
    </>
  );
}

type DepartmentsWorkspaceProps = {
  isAdmin: boolean;
  canManageAvailability: boolean;
  initialPanelData: AvailabilityPanelData | null;
  initialAvailability?: MyAvailabilityResult | null;
  children: ReactNode;
};

/**
 * Coordena cabeçalho, widget minimalista e abertura do Sheet/Drawer de
 * disponibilidade em `/departments`, garantindo feedback imediato ao salvar.
 */
export function DepartmentsWorkspace({
  isAdmin,
  canManageAvailability,
  initialPanelData,
  initialAvailability = null,
  children,
}: DepartmentsWorkspaceProps) {
  const [open, setOpen] = useState(false);
  const [hasSaved, setHasSaved] = useState(
    initialPanelData?.availability.hasSaved ??
      initialAvailability?.hasSaved ??
      false,
  );
  const panel = useAvailabilityPanelData(initialPanelData);

  const showPendingReminder = canManageAvailability && !hasSaved;

  const openAvailability = () => {
    setOpen(true);
    panel.ensureLoaded();
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Departamentos
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Departamentos em que você participa e sua disponibilidade do dia a
            dia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin ? (
            <CreateDepartmentDialog
              variant={showPendingReminder ? "outline" : "default"}
            />
          ) : null}
          {canManageAvailability ? (
            <Button
              type="button"
              variant={showPendingReminder ? "default" : "outline"}
              size="lg"
              onClick={openAvailability}
              className="h-9 gap-2 max-sm:h-11"
            >
              <CalendarCheckIcon className="size-4" aria-hidden="true" />
              Configurar disponibilidade
            </Button>
          ) : null}
        </div>
      </header>

      <AvailabilityReminderWidget
        variant="departments"
        hasSaved={hasSaved}
        canManageAvailability={canManageAvailability}
        onConfigureClick={openAvailability}
      />

      {children}

      {canManageAvailability ? (
        <AvailabilitySheet
          open={open}
          onOpenChange={setOpen}
          data={panel.data}
          loading={panel.loading}
          error={panel.error}
          onRetry={panel.reload}
          onSaved={(updatedAt) => {
            panel.markSaved(updatedAt);
            setHasSaved(true);
          }}
        />
      ) : null}
    </>
  );
}

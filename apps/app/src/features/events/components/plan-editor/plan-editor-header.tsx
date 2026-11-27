"use client";

import { ClockIcon, FileTextIcon, PencilIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanItemDialog } from "../plan-item-dialog";
import { SharePlanDialog } from "../share-plan-dialog";
import { formatHoursMinutes } from "./format";
import { PlanActionsMenu } from "./plan-actions-menu";
import type { PlanEditorController } from "./use-plan-editor";

export function PlanEditorHeader({
  controller,
}: {
  controller: PlanEditorController;
}) {
  const {
    eventId,
    eventTitle,
    people,
    songs,
    canManage,
    computedItems,
    totalPlanSeconds,
    diffSeconds,
    handleExportPdfDirect,
    openMobileDrawer,
  } = controller;

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-lg">Ordem do Culto</span>
          <Badge variant="secondary" className="gap-1 font-mono text-xs">
            <ClockIcon className="size-3" />
            {formatHoursMinutes(totalPlanSeconds)} planejados
          </Badge>

          {diffSeconds >= 0 ? (
            <span className="text-xs text-muted-foreground">
              ({formatHoursMinutes(diffSeconds)} livres da duração prevista)
            </span>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Excede {formatHoursMinutes(Math.abs(diffSeconds))}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {computedItems.length === 0
            ? "Nenhum momento cadastrado ainda."
            : `${computedItems.filter((i) => i.type === "item").length} momentos e ${
                computedItems.filter((i) => i.type === "header").length
              } seções planejadas.`}
        </p>
      </div>

      {/* Desktop actions */}
      {canManage ? (
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          <PlanItemDialog
            eventId={eventId}
            people={people}
            songs={songs}
            mode="create-header"
          />
          <PlanItemDialog
            eventId={eventId}
            people={people}
            songs={songs}
            mode="create-item"
          />

          <SharePlanDialog eventId={eventId} eventTitle={eventTitle} />

          <PlanActionsMenu controller={controller} />
        </div>
      ) : null}

      {!canManage && computedItems.length > 0 ? (
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdfDirect}
            className="gap-1.5 h-9"
          >
            <FileTextIcon className="size-4 text-primary" />
            <span>Baixar PDF</span>
          </Button>
        </div>
      ) : null}

      {/* Mobile: Botão Editar Cronograma */}
      {canManage && computedItems.length > 0 ? (
        <div className="sm:hidden pt-1">
          <Button
            onClick={openMobileDrawer}
            className="w-full gap-2 rounded-xl h-9 font-medium"
            size="sm"
          >
            <PencilIcon className="size-3.5" />
            Editar Cronograma
          </Button>
        </div>
      ) : null}
    </div>
  );
}

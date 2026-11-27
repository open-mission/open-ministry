"use client";

import {
  BookmarkPlusIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportPlanAsJson } from "../plan-template-dialogs";
import type { PlanEditorController } from "./use-plan-editor";

type PlanActionsMenuProps = {
  controller: PlanEditorController;
  variant?: "desktop" | "mobile";
};

export function PlanActionsMenu({
  controller,
  variant = "desktop",
}: PlanActionsMenuProps) {
  const {
    eventTitle,
    computedItems,
    handleExportPdfDirect,
    handleExportPdfBackground,
    setManageTemplatesOpen,
    setSaveDialogOpen,
    setImportDialogOpen,
    setClearDialogOpen,
  } = controller;

  const isEmpty = computedItems.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "mobile" ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs shrink-0 rounded-lg"
          >
            <MoreHorizontalIcon className="size-3.5" />
            Opções
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            <MoreHorizontalIcon className="size-4" />
            <span>Modelos &amp; Ações</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={handleExportPdfDirect}
          disabled={isEmpty}
          className="gap-2 cursor-pointer"
        >
          <FileTextIcon className="size-4 text-primary" />
          <span>Exportar PDF (Imediato)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportPdfBackground}
          disabled={isEmpty}
          className="gap-2 cursor-pointer"
        >
          <LayersIcon className="size-4 text-muted-foreground" />
          <span>Exportar PDF (2º Plano)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setManageTemplatesOpen(true)}
          className="gap-2 cursor-pointer"
        >
          <LayoutTemplateIcon className="size-4 text-muted-foreground" />
          <span>Modelos de cronograma</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setSaveDialogOpen(true)}
          disabled={isEmpty}
          className="gap-2 cursor-pointer"
        >
          <BookmarkPlusIcon className="size-4 text-muted-foreground" />
          <span>Salvar como modelo...</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => exportPlanAsJson(eventTitle, computedItems)}
          disabled={isEmpty}
          className="gap-2 cursor-pointer"
        >
          <DownloadIcon className="size-4 text-muted-foreground" />
          <span>Exportar arquivo (.json)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setImportDialogOpen(true)}
          className="gap-2 cursor-pointer"
        >
          <UploadIcon className="size-4 text-muted-foreground" />
          <span>Importar arquivo (.json)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setClearDialogOpen(true)}
          disabled={isEmpty}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2Icon className="size-4" />
          <span>Limpar cronograma</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import type { ComputedPlanItem } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";
import type { RawPlanItem } from "./plan-editor.types";

export type SortableSectionRowProps = {
  item: ComputedPlanItem;
  index: number;
  totalCount: number;
  canManage: boolean;
  isPending: boolean;
  deletingId: string | null;
  onMove: (index: number, direction: "up" | "down") => void;
  onEdit: (item: RawPlanItem) => void;
  onDelete: (id: string) => void;
};

export function SortableSectionRow({
  item,
  index,
  totalCount,
  canManage,
  isPending,
  deletingId,
  onMove,
  onEdit,
  onDelete,
}: SortableSectionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rawItem: RawPlanItem = {
    id: item.id,
    eventId: item.eventId,
    sectionId: item.sectionId,
    type: item.type,
    title: item.title,
    description: item.description,
    durationSeconds: item.durationSeconds,
    order: item.order,
    personId: item.personId,
    customResponsible: item.customResponsible,
    songId: item.songId,
    song: item.song,
    person: item.person,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center justify-between bg-muted/50 px-3.5 py-2.5 rounded-lg border transition-colors hover:bg-muted/70",
        isDragging &&
          "relative z-30 bg-muted/90 shadow-md ring-2 ring-primary/40 rounded-lg opacity-95",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {canManage ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            title="Arrastar para reordenar"
            aria-label="Arrastar para reordenar"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
        <span className="font-heading text-xs font-semibold tracking-wider text-foreground uppercase truncate">
          {item.title}
        </span>
      </div>

      {canManage ? (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={index === 0 || isPending}
            onClick={() => onMove(index, "up")}
            title="Mover para cima"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowUpIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={index === totalCount - 1 || isPending}
            onClick={() => onMove(index, "down")}
            title="Mover para baixo"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowDownIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(rawItem)}
            title="Editar seção"
            className="text-muted-foreground hover:text-foreground"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive"
            disabled={deletingId === item.id || isPending}
            onClick={() => onDelete(item.id)}
            title="Excluir seção"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

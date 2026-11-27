"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  Music2Icon,
  PencilIcon,
  UserIcon,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { QuickDrawerSong } from "@/components/songs/song-quick-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format";
import type { ComputedPlanItem } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";
import type { RawPlanItem } from "./plan-editor.types";
import { formatDurationMinutesLabel } from "./format";
import { PlanRemoveAlert, PlanRemoveDrawer } from "./plan-remove-confirmation";

export type SortableItemRowProps = {
  item: ComputedPlanItem;
  index: number;
  totalCount: number;
  canManage: boolean;
  isPending: boolean;
  deletingId: string | null;
  onMove: (index: number, direction: "up" | "down") => void;
  onEdit: (item: RawPlanItem) => void;
  onDelete: (id: string) => void;
  onOpenSong?: (song: QuickDrawerSong) => void;
};

export function SortableItemRow({
  item,
  index,
  totalCount,
  canManage,
  isPending,
  deletingId: _deletingId,
  onMove,
  onEdit,
  onDelete,
  onOpenSong,
}: SortableItemRowProps) {
  const [removeOpen, setRemoveOpen] = useState(false);
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
        "group flex flex-col gap-2 p-3 transition-colors rounded-xl border bg-card hover:bg-muted/20 sm:rounded-none sm:border-0 sm:grid sm:grid-cols-[36px_80px_90px_1fr_220px_100px] sm:items-center sm:gap-3 sm:px-4 sm:py-3 shadow-2xs sm:shadow-none",
        isDragging &&
          "relative z-30 bg-card shadow-lg ring-2 ring-primary/40 rounded-xl opacity-95",
      )}
    >
      {/* Mobile Top Row: Drag Handle + Time + Duration Badge + Actions */}
      <div className="flex items-center justify-between sm:contents">
        <div className="flex items-center gap-2 sm:contents">
          {/* Drag Handle */}
          <div className="flex items-center">
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
            ) : (
              <span className="size-4" />
            )}
          </div>

          {/* Horário */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span className="font-semibold text-foreground">{item.timeLabel}</span>
          </div>

          {/* Duração */}
          <div>
            <Badge variant="secondary" className="font-mono text-xs font-normal">
              {formatDurationMinutesLabel(item.durationSeconds)}
            </Badge>
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center justify-end gap-0.5 sm:hidden">
          {canManage ? (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === 0 || isPending}
                onClick={() => onMove(index, "up")}
                title="Subir"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowUpIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === totalCount - 1 || isPending}
                onClick={() => onMove(index, "down")}
                title="Descer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowDownIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onEdit(rawItem)}
                title="Editar"
                className="text-muted-foreground hover:text-foreground"
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <PlanRemoveDrawer
                open={removeOpen}
                onOpenChange={setRemoveOpen}
                itemTitle={item.title}
                onConfirm={() => onDelete(item.id)}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Título e Detalhes */}
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-sm text-foreground">{item.title}</p>
        {item.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        ) : null}
        {item.song ? (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => onOpenSong?.(item.song!)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              title="Abrir cifra e letra desta música"
            >
              <Music2Icon className="size-3" />
              <span>{item.song.title}</span>
              {item.song.tone ? (
                <span className="font-bold text-[11px] opacity-80">
                  ({item.song.tone})
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      {/* Responsável */}
      <div className="flex items-center gap-2">
        {item.person ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="size-5 shrink-0 ring-1 ring-border">
              <AvatarImage src={item.person.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[11px]">
                {getInitials(item.person.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium text-foreground">
              {item.person.name}
            </span>
          </div>
        ) : item.customResponsible ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="size-3" />
            </span>
            <span className="truncate text-xs text-foreground">
              {item.customResponsible}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic">
            A definir
          </span>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center justify-end gap-1">
        {canManage ? (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === 0 || isPending}
              onClick={() => onMove(index, "up")}
              title="Subir"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={index === totalCount - 1 || isPending}
              onClick={() => onMove(index, "down")}
              title="Descer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowDownIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(rawItem)}
              title="Editar"
              className="text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <PlanRemoveAlert
              itemTitle={item.title}
              onConfirm={() => onDelete(item.id)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

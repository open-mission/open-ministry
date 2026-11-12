"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SongWithUsage } from "@/lib/songs";
import { SongCard } from "./song-card";

type SortableSongCardProps = {
  song: SongWithUsage;
  canManage?: boolean;
  canAddToNextService?: boolean;
  existingCollections?: string[];
  disabled?: boolean;
};

export function SortableSongCard({
  song,
  canManage,
  canAddToNextService,
  existingCollections,
  disabled = false,
}: SortableSongCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled });

  const dragHandle = (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      disabled={disabled}
      aria-label={`Reordenar ${song.title}`}
      aria-roledescription="sortable"
      title={`Reordenar ${song.title}`}
      className="inline-flex size-11 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GripVerticalIcon className="size-4" aria-hidden="true" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "relative z-20 opacity-90")}
    >
      <SongCard
        song={song}
        canManage={canManage}
        canAddToNextService={canAddToNextService}
        existingCollections={existingCollections}
        dragHandle={dragHandle}
      />
    </div>
  );
}

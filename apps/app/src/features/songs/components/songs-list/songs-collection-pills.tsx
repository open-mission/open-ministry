"use client";

import { FolderIcon, LayersIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SongsCollectionPillsProps = {
  collections: string[];
  songs: { collection?: string | null }[];
  totalSongs: number;
  collectionFilter: string;
  onCollectionFilterChange: (value: string) => void;
};

export function SongsCollectionPills({
  collections,
  songs,
  totalSongs,
  collectionFilter,
  onCollectionFilterChange,
}: SongsCollectionPillsProps) {
  if (collections.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onCollectionFilterChange("")}
        aria-pressed={!collectionFilter}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8",
          !collectionFilter
            ? "bg-foreground text-background shadow-2xs"
            : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <LayersIcon className="size-3.5" />
        <span>Todos os grupos</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            !collectionFilter
              ? "bg-background/20 text-background"
              : "bg-muted text-muted-foreground",
          )}
        >
          {totalSongs}
        </span>
      </button>

      {collections.map((collection) => {
        const count = songs.filter((song) => song.collection === collection).length;
        const isSelected = collectionFilter === collection;

        return (
          <button
            key={collection}
            type="button"
            onClick={() =>
              onCollectionFilterChange(isSelected ? "" : collection)
            }
            aria-pressed={isSelected}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8",
              isSelected
                ? "border border-primary/30 bg-primary/10 font-bold text-primary shadow-2xs"
                : "border border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <FolderIcon className="size-3.5 opacity-80" />
            <span>{collection}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                isSelected
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { reorderSongsAction } from "@/app/actions/songs";
import { PageHeaderScaffold } from "@/components/app/page-header-scaffold";
import { Button } from "@/components/ui/button";
import { songKeys, useSongsQuery } from "@/hooks/use-songs";
import {
  getManualSongOrderIds,
  isSongReorderingEnabled,
  moveSongId,
} from "@/lib/songs-order";
import type { SongWithUsage } from "@/lib/songs";
import { AddSongChoiceDialog } from "./add-song-choice-dialog";
import { SongCard } from "./song-card";
import { SortableSongCard } from "./sortable-song-card";
import { SongListHeader } from "./songs-list/song-list-header";
import { SongsCollectionPills } from "./songs-list/songs-collection-pills";
import { SongsEmptyState } from "./songs-list/songs-empty-state";
import { SongsToolbar } from "./songs-list/songs-toolbar";
import {
  normalizeSearch,
  type SortOption,
  type StatusFilter,
} from "./songs-list/types";

type SongsListViewProps = {
  songs: SongWithUsage[];
  existingCollections?: string[];
  organizationName?: string;
  canManage?: boolean;
  canAddToNextService?: boolean;
  canReorder?: boolean;
};

const songReorderInstructions = {
  draggable:
    "Para reordenar uma música, pressione espaço. Use as setas para escolher a posição e pressione espaço para confirmar ou Escape para cancelar.",
};

export function SongsListView({
  songs: initialSongs,
  existingCollections = [],
  organizationName,
  canManage = true,
  canAddToNextService = false,
  canReorder = false,
}: SongsListViewProps) {
  const { data } = useSongsQuery({
    initialData: { songs: initialSongs, collections: existingCollections },
  });
  const queryClient = useQueryClient();

  const songs = data?.songs ?? initialSongs;
  const dataCollections = data?.collections;
  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const collection of existingCollections) {
      if (collection?.trim()) set.add(collection.trim());
    }
    if (dataCollections) {
      for (const collection of dataCollections) {
        if (collection?.trim()) set.add(collection.trim());
      }
    }
    if (songs) {
      for (const song of songs) {
        if (song.collection?.trim()) set.add(song.collection.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [existingCollections, dataCollections, songs]);

  const [search, setSearch] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("title");
  const [optimisticManualOrder, setOptimisticManualOrder] = useState<
    string[] | null
  >(null);
  const [isReordering, setIsReordering] = useState(false);

  const hasActiveFilters =
    Boolean(search.trim() || toneFilter || collectionFilter) ||
    statusFilter !== "all";
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (toneFilter ? 1 : 0) +
    (collectionFilter ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const persistedManualOrder = useMemo(
    () => getManualSongOrderIds(songs),
    [songs],
  );
  const manualOrderIds = optimisticManualOrder ?? persistedManualOrder;
  const manualOrderPositions = useMemo(
    () => new Map(manualOrderIds.map((id, index) => [id, index])),
    [manualOrderIds],
  );
  const canReorderVisibleSongs = isSongReorderingEnabled(
    canReorder,
    sortOption,
    hasActiveFilters,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filteredSongs = useMemo(() => {
    let result = songs;

    if (collectionFilter) {
      result = result.filter((song) => song.collection === collectionFilter);
    }

    if (toneFilter) {
      result = result.filter((song) => song.tone === toneFilter);
    }

    switch (statusFilter) {
      case "missing-chords":
        result = result.filter((song) => !song.chords?.trim());
        break;
      case "missing-lyrics":
        result = result.filter((song) => !song.lyrics?.trim());
        break;
      case "scheduled":
        result = result.filter((song) => Boolean(song.usage.nextEvent));
        break;
      case "never":
        result = result.filter((song) => song.usage.eventCount === 0);
        break;
      default:
        break;
    }

    const query = normalizeSearch(search.trim());
    if (query) {
      result = result.filter((song) =>
        [
          song.title,
          song.artist,
          song.collection,
          song.tone,
          ...(song.tags ?? []),
        ].some((value) => normalizeSearch(value).includes(query)),
      );
    }

    const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
    return [...result].sort((a, b) => {
      if (sortOption === "manual") {
        const manualOrderDiff =
          (manualOrderPositions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (manualOrderPositions.get(b.id) ?? Number.MAX_SAFE_INTEGER);
        if (manualOrderDiff !== 0) return manualOrderDiff;
      }
      if (sortOption === "usage") {
        const usageDiff = b.usage.eventCount - a.usage.eventCount;
        if (usageDiff !== 0) return usageDiff;
        const nextA = a.usage.nextEvent?.startsAt
          ? new Date(a.usage.nextEvent.startsAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const nextB = b.usage.nextEvent?.startsAt
          ? new Date(b.usage.nextEvent.startsAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (nextA !== nextB) return nextA - nextB;
      }
      if (sortOption === "updated") {
        const updatedDiff =
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (updatedDiff !== 0) return updatedDiff;
      }
      return collator.compare(a.title, b.title);
    });
  }, [
    songs,
    search,
    toneFilter,
    collectionFilter,
    statusFilter,
    sortOption,
    manualOrderPositions,
  ]);

  const counts = useMemo(() => {
    let missingChords = 0;
    let missingLyrics = 0;
    let neverUsed = 0;

    for (const song of songs) {
      if (!song.chords?.trim()) missingChords += 1;
      if (!song.lyrics?.trim()) missingLyrics += 1;
      if (song.usage.eventCount === 0) neverUsed += 1;
    }

    return {
      total: songs.length,
      missingChords,
      missingLyrics,
      neverUsed,
    };
  }, [songs]);

  const clearFilters = () => {
    setSearch("");
    setToneFilter("");
    setCollectionFilter("");
    setStatusFilter("all");
  };

  const handleSongDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || !canReorderVisibleSongs || isReordering) return;

    const nextOrder = moveSongId(
      manualOrderIds,
      String(active.id),
      String(over.id),
    );
    if (nextOrder === manualOrderIds) return;

    setOptimisticManualOrder(nextOrder);
    setIsReordering(true);

    try {
      const result = await reorderSongsAction(nextOrder);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar a ordem.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: songKeys.lists() });
      toast.success("Ordem do repertório salva.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a ordem do repertório.",
      );
    } finally {
      setOptimisticManualOrder(null);
      setIsReordering(false);
    }
  };

  const renderSongCard = (song: SongWithUsage) => (
    <SongCard
      key={song.id}
      song={song}
      canManage={canManage}
      canAddToNextService={canAddToNextService}
      existingCollections={collections}
    />
  );

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4">
      <PageHeaderScaffold
        title="Repertório"
        desktopTitle="Repertório de Músicas"
        subtitle={organizationName}
        level="root-tab"
        badge={
          <span
            className="inline-flex h-6 items-center rounded-full bg-muted px-2 text-[11px] font-medium tabular-nums text-muted-foreground"
            title={`${songs.length} músicas no repertório`}
          >
            {songs.length} {songs.length === 1 ? "música" : "músicas"}
          </span>
        }
        mobileAction={
          canManage ? (
            <AddSongChoiceDialog
              existingCollections={collections}
              trigger={
                <Button
                  size="icon"
                  className="relative size-9 rounded-full shadow-xs after:absolute after:-inset-1.5 after:content-['']"
                  aria-label="Adicionar música"
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                </Button>
              }
            />
          ) : null
        }
        desktopActions={
          canManage ? (
            <AddSongChoiceDialog existingCollections={collections} />
          ) : null
        }
      />

      <div className="flex flex-col gap-2.5">
        <SongsToolbar
          search={search}
          onSearchChange={setSearch}
          toneFilter={toneFilter}
          onToneFilterChange={setToneFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          counts={counts}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        <SongsCollectionPills
          collections={collections}
          songs={songs}
          totalSongs={songs.length}
          collectionFilter={collectionFilter}
          onCollectionFilterChange={setCollectionFilter}
        />

        {canReorder && sortOption === "manual" && hasActiveFilters ? (
          <p role="status" className="text-[11px] text-muted-foreground">
            Limpe a busca e os filtros para reordenar as músicas.
          </p>
        ) : null}
      </div>

      {filteredSongs.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <SongListHeader />
          {canReorderVisibleSongs ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSongDragEnd}
              accessibility={{
                screenReaderInstructions: songReorderInstructions,
              }}
            >
              <SortableContext
                items={filteredSongs.map((song) => song.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y divide-border/60">
                  {filteredSongs.map((song) => (
                    <SortableSongCard
                      key={song.id}
                      song={song}
                      canManage={canManage}
                      canAddToNextService={canAddToNextService}
                      existingCollections={collections}
                      disabled={isReordering}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredSongs.map(renderSongCard)}
            </div>
          )}
        </div>
      ) : (
        <SongsEmptyState
          hasSongs={songs.length > 0}
          canManage={canManage}
          existingCollections={collections}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      )}
    </div>
  );
}

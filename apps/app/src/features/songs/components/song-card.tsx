"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  FolderIcon,
  GaugeIcon,
  HeadphonesIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";

import { addSongToNextServiceAction } from "@/app/actions/songs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { songKeys } from "@/hooks/use-songs";
import { formatDate } from "@/lib/format";
import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";
import type { SongRecord, SongWithUsage } from "@/lib/songs";
import { cn } from "@/lib/utils";
import { DeleteSongDialog } from "./delete-song-dialog";
import { SetSongGroupDialog } from "./set-song-group-dialog";
import { SongCardActionsMenu } from "./song-card-actions-menu";
import { SongFormDialog } from "./song-form-dialog";
import { getStreamingLinks, streamingLinkLabel } from "./song-streaming-links";

type SongCardProps = {
  song: SongWithUsage;
  canManage?: boolean;
  canAddToNextService?: boolean;
  existingCollections?: string[];
  dragHandle?: ReactNode;
  onSongUpdated?: (song: SongRecord) => void;
  onSongDeleted?: (songId: string) => void;
};

export function SongCard({
  song,
  canManage = true,
  canAddToNextService = false,
  existingCollections = [],
  dragHandle,
  onSongUpdated,
  onSongDeleted,
}: SongCardProps) {
  const queryClient = useQueryClient();
  const [isAddingToPlan, startAddingToPlan] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const hasChords = Boolean(song.chords?.trim());
  const hasLyrics = Boolean(song.lyrics?.trim());
  const streamingLinks = getStreamingLinks(song);
  const searchLinks = streamingLinks.filter((link) =>
    isStreamingSearchUrl(link.url),
  );
  const hasSearchLinks = searchLinks.length > 0;
  const onlySearchLinks =
    hasSearchLinks && searchLinks.length === streamingLinks.length;
  const streamingHint = onlySearchLinks
    ? "Abre uma busca no streaming (o link direto ainda não foi cadastrado)"
    : hasSearchLinks
      ? "Alguns links abrem uma busca no streaming"
      : "Links de áudio da música";
  const rhythmLabel = [
    song.bpm ? `${song.bpm} BPM` : null,
    song.timeSignature,
  ]
    .filter(Boolean)
    .join(" · ");

  const usage = song.usage;
  const lastEventLabel = usage?.lastEvent
    ? formatDate(usage.lastEvent.startsAt)
    : "Nunca usada";
  const usageCountLabel = usage?.eventCount
    ? `${usage.eventCount} culto${usage.eventCount === 1 ? "" : "s"}`
    : null;

  const handleAddToNextService = () => {
    startAddingToPlan(async () => {
      const result = await addSongToNextServiceAction(song.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível adicionar ao culto.");
        return;
      }
      toast.success(
        `“${song.title}” adicionada ao cronograma de ${result.eventTitle}.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: songKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: songKeys.detail(song.id),
        }),
      ]);
    });
  };

  return (
    <>
      <div className="group grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2.4fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.15fr)_9rem] md:gap-4 md:px-3 md:py-2">
        {/* MÚSICA */}
        <div className="flex min-w-0 items-center gap-2">
          {dragHandle}
          <Link
            href={`/songs/${song.id}`}
            prefetch={true}
            className="min-w-0 flex-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:text-primary"
          >
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {song.title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {song.artist || "Artista não informado"}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden">
              {song.tone ? (
                <span className="text-[11px] font-semibold text-primary">
                  Tom {song.tone}
                </span>
              ) : null}
              {song.capo > 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  Capo {song.capo}
                </span>
              ) : null}
              {song.collection ? (
                <Badge
                  variant="outline"
                  className="h-5 max-w-full gap-1 truncate border-primary/25 bg-primary/5 px-1.5 text-[11px] font-semibold text-primary"
                >
                  <FolderIcon className="size-3 shrink-0" />
                  <span className="truncate">{song.collection}</span>
                </Badge>
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  hasChords
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground",
                )}
              >
                <FileMusicIcon className="size-3 shrink-0" aria-hidden="true" />
                {hasChords ? "Cifra" : "Sem cifra"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  hasLyrics
                    ? "text-sky-700 dark:text-sky-300"
                    : "text-muted-foreground",
                )}
              >
                <FileTextIcon className="size-3 shrink-0" aria-hidden="true" />
                {hasLyrics ? "Letra" : "Sem letra"}
              </span>
            </div>
          </Link>
        </div>

        {/* TOM */}
        <div className="hidden min-w-0 md:block">
          {song.tone ? (
            <span className="text-xs font-semibold text-primary">
              Tom {song.tone}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {song.capo > 0 ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Capo {song.capo}
            </span>
          ) : null}
          {rhythmLabel ? (
            <span className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
              <GaugeIcon className="size-3 shrink-0" aria-hidden="true" />
              {rhythmLabel}
            </span>
          ) : null}
        </div>

        {/* MATERIAL */}
        <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              hasChords
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-muted-foreground",
            )}
            title={hasChords ? "Cifra disponível" : "Sem cifra cadastrada"}
          >
            <FileMusicIcon className="size-3 shrink-0" aria-hidden="true" />
            {hasChords ? "Cifra" : "Sem cifra"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              hasLyrics
                ? "text-sky-700 dark:text-sky-300"
                : "text-muted-foreground",
            )}
            title={hasLyrics ? "Letra disponível" : "Sem letra cadastrada"}
          >
            <FileTextIcon className="size-3 shrink-0" aria-hidden="true" />
            {hasLyrics ? "Letra" : "Sem letra"}
          </span>
        </div>

        {/* ÚLTIMO CULTO */}
        <div className="hidden min-w-0 md:block">
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <CalendarDaysIcon className="size-3.5 shrink-0" />
            <span className="truncate">{lastEventLabel}</span>
          </p>
          {usageCountLabel ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {usageCountLabel}
            </span>
          ) : null}
        </div>

        {/* AÇÕES */}
        <div className="flex items-center justify-end gap-1">
          {streamingLinks.length > 0 ? (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="size-11 gap-1.5 px-0 text-xs font-medium md:h-8 md:w-auto md:px-2.5"
                      aria-label={`Links de áudio da música — ${streamingHint}`}
                    >
                      <HeadphonesIcon className="size-4 md:size-3.5" />
                      <span className="hidden md:inline">Ouvir</span>
                      {hasSearchLinks ? (
                        <SearchIcon
                          className="hidden size-3 text-muted-foreground md:inline"
                          aria-hidden="true"
                        />
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">{streamingHint}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                {streamingLinks.map((link) => (
                  <DropdownMenuItem key={link.platform} asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="gap-2"
                    >
                      {isStreamingSearchUrl(link.url) ? (
                        <SearchIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <ExternalLinkIcon className="size-4 text-muted-foreground" />
                      )}
                      <span>{streamingLinkLabel(link)}</span>
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <SongCardActionsMenu
            song={song}
            canManage={canManage}
            canAddToNextService={canAddToNextService}
            isAddingToPlan={isAddingToPlan}
            onAddToNextService={handleAddToNextService}
            onEdit={() => setEditOpen(true)}
            onGroup={() => setGroupOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      {editOpen && (
        <SongFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          songId={song.id}
          canUpdate={Boolean(canManage)}
          existingCollections={existingCollections}
          initialData={{
            title: song.title,
            artist: song.artist ?? "",
            tone: song.tone ?? "",
            capo: song.capo,
            bpm: song.bpm,
            timeSignature: song.timeSignature ?? "4/4",
            lyrics: song.lyrics ?? "",
            chords: song.chords ?? "",
            youtubeUrl: song.youtubeUrl ?? "",
            youtubeMusicUrl: song.youtubeMusicUrl ?? "",
            spotifyUrl: song.spotifyUrl ?? "",
            collection: song.collection ?? "",
            tags: song.tags ?? [],
          }}
          onSongUpdated={onSongUpdated}
        />
      )}

      {deleteOpen && (
        <DeleteSongDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          songId={song.id}
          songTitle={song.title}
          onSongDeleted={onSongDeleted}
        />
      )}

      {groupOpen && (
        <SetSongGroupDialog
          song={{
            id: song.id,
            title: song.title,
            collection: song.collection,
            tags: song.tags,
          }}
          existingCollections={existingCollections}
          open={groupOpen}
          onOpenChange={setGroupOpen}
        />
      )}
    </>
  );
}

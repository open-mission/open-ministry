"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  FolderIcon,
  GaugeIcon,
  HeadphonesIcon,
  MoreVerticalIcon,
  Music2Icon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { addSongToNextServiceAction } from "@/app/actions/songs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { songKeys } from "@/hooks/use-songs";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/format";
import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";
import type { SongRecord, SongWithUsage } from "@/lib/songs";
import { cn } from "@/lib/utils";
import { DeleteSongDialog } from "./delete-song-dialog";
import { SetSongGroupDialog } from "./set-song-group-dialog";
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
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isAddingToPlan, startAddingToPlan] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
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
  const usageLabel = usage?.nextEvent
    ? `Próximo: ${formatDate(usage.nextEvent.startsAt)} · ${usage.nextEvent.eventTitle}`
    : usage?.lastEvent
      ? `Último: ${formatDate(usage.lastEvent.startsAt)}`
      : "Nunca usada em cultos";

  const handleAddToNextService = () => {
    setMenuOpen(false);
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

  const addToPlanItem = (
    <button
      type="button"
      onClick={handleAddToNextService}
      disabled={isAddingToPlan}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
    >
      <CalendarPlusIcon className="size-4 text-muted-foreground" />
      <span>
        {isAddingToPlan ? "Adicionando..." : "Adicionar ao próximo culto"}
      </span>
    </button>
  );

  return (
    <>
      <div className="group relative flex min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-md sm:p-5">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <Link
              href={`/dashboard/songs/${song.id}`}
              prefetch={true}
              className="min-w-0 flex-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:text-primary"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music2Icon className="size-3.5" />
                </span>
                <h3 className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
                  {song.title}
                </h3>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {song.artist || "Artista não informado"}
              </p>
            </Link>

            {dragHandle}

            {canManage || canAddToNextService ? (
              isMobile ? (
                <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground sm:size-9"
                      aria-label="Opções da música"
                      title="Opções da música"
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80dvh] rounded-t-[24px] p-0">
                    <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Music2Icon className="size-4" />
                        </span>
                        <DrawerTitle className="truncate text-left font-heading text-base font-bold">
                          {song.title}
                        </DrawerTitle>
                      </div>
                      <DrawerDescription className="truncate text-left text-xs text-muted-foreground">
                        {song.artist || "Opções da música"}
                      </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex flex-col gap-1 p-3">
                      <Button
                        variant="ghost"
                        asChild
                        className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                      >
                        <Link
                          href={`/dashboard/songs/${song.id}`}
                          prefetch={true}
                          onClick={() => setMenuOpen(false)}
                        >
                          <FileTextIcon className="size-4 text-muted-foreground" />
                          <span>Ver detalhes</span>
                        </Link>
                      </Button>

                      {canManage ? (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setMenuOpen(false);
                              setEditOpen(true);
                            }}
                            className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                          >
                            <PencilIcon className="size-4 text-muted-foreground" />
                            <span>Editar música</span>
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => {
                              setMenuOpen(false);
                              setGroupOpen(true);
                            }}
                            className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                          >
                            <FolderIcon className="size-4 text-muted-foreground" />
                            <span>Definir grupo</span>
                          </Button>
                        </>
                      ) : null}

                      {canAddToNextService ? addToPlanItem : null}

                      {canManage ? (
                        <>
                          <div className="my-1 border-t border-border/60" />
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setMenuOpen(false);
                              setDeleteOpen(true);
                            }}
                            className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2Icon className="size-4" />
                            <span>Excluir</span>
                          </Button>
                        </>
                      ) : null}
                    </div>

                    <DrawerFooter className="border-t pt-2 pb-4">
                      <DrawerClose asChild>
                        <Button variant="outline" className="w-full">
                          Cancelar
                        </Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground sm:size-9"
                      aria-label="Opções da música"
                      title="Opções da música"
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/songs/${song.id}`} prefetch={true}>
                        <FileTextIcon className="mr-2 size-4" />
                        Ver detalhes
                      </Link>
                    </DropdownMenuItem>
                    {canManage ? (
                      <>
                        <DropdownMenuItem onClick={() => setEditOpen(true)}>
                          <PencilIcon className="mr-2 size-4" />
                          Editar música
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setGroupOpen(true)}>
                          <FolderIcon className="mr-2 size-4" />
                          Definir grupo
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    {canAddToNextService ? (
                      <DropdownMenuItem
                        onClick={handleAddToNextService}
                        disabled={isAddingToPlan}
                      >
                        <CalendarPlusIcon className="mr-2 size-4" />
                        {isAddingToPlan
                          ? "Adicionando..."
                          : "Adicionar ao próximo culto"}
                      </DropdownMenuItem>
                    ) : null}
                    {canManage ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2Icon className="mr-2 size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {song.collection ? (
              <Badge
                variant="outline"
                className="max-w-full shrink-0 gap-1 truncate border-primary/25 bg-primary/5 text-[11px] font-semibold text-primary"
              >
                <FolderIcon className="size-3 shrink-0" />
                <span className="truncate">{song.collection}</span>
              </Badge>
            ) : null}

            {song.tone ? (
              <span className="inline-flex shrink-0 items-baseline gap-1">
                <span className="text-xs font-semibold text-primary">
                  Tom {song.tone}
                </span>
                {song.capo > 0 ? (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    · Capo {song.capo}
                  </span>
                ) : null}
              </span>
            ) : song.capo > 0 ? (
              <span className="text-[11px] font-medium text-muted-foreground">
                Capo {song.capo}
              </span>
            ) : null}

            {rhythmLabel ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                <GaugeIcon className="size-3 shrink-0" aria-hidden="true" />
                {rhythmLabel}
              </span>
            ) : null}

            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  hasChords && "text-emerald-700 dark:text-emerald-300",
                )}
                title={hasChords ? "Cifra disponível" : "Sem cifra cadastrada"}
              >
                <FileMusicIcon className="size-3 shrink-0" aria-hidden="true" />
                {hasChords ? "Cifra" : "Sem cifra"}
              </span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  hasLyrics && "text-sky-700 dark:text-sky-300",
                )}
                title={hasLyrics ? "Letra disponível" : "Sem letra cadastrada"}
              >
                <FileTextIcon className="size-3 shrink-0" aria-hidden="true" />
                {hasLyrics ? "Letra" : "Sem letra"}
              </span>
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDaysIcon className="size-3.5 shrink-0" />
            <span className="truncate">{usageLabel}</span>
            {usage?.eventCount ? (
              <span className="shrink-0">
                · {usage.eventCount} culto{usage.eventCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="min-w-0">
            {streamingLinks.length > 0 ? (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 text-xs font-medium"
                        aria-label={`Links de áudio da música — ${streamingHint}`}
                      >
                        <HeadphonesIcon className="size-3.5" />
                        Ouvir
                        {hasSearchLinks ? (
                          <SearchIcon
                            className="size-3 text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">{streamingHint}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-56">
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
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="size-1.5 rounded-full bg-muted-foreground/60"
                  aria-hidden="true"
                />
                Sem links de áudio
              </span>
            )}
          </div>

          <Link
            href={`/dashboard/songs/${song.id}`}
            prefetch={true}
            className="ml-auto shrink-0 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Acessar ›
          </Link>
        </div>
      </div>

      {editOpen && (
        <SongFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          songId={song.id}
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

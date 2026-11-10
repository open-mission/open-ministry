"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  FolderIcon,
  MoreVerticalIcon,
  Music2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

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
import { useIsMobile } from "@/hooks/use-mobile";
import type { SongRecord } from "@/lib/songs";
import { DeleteSongDialog } from "./delete-song-dialog";
import { SongFormDialog } from "./song-form-dialog";

type SongCardProps = {
  song: SongRecord;
  canManage?: boolean;
  existingCollections?: string[];
  onSongUpdated?: (song: SongRecord) => void;
  onSongDeleted?: (songId: string) => void;
};

export function SongCard({
  song,
  canManage = true,
  existingCollections = [],
  onSongUpdated,
  onSongDeleted,
}: SongCardProps) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasChords = Boolean(song.chords?.trim());
  const hasLyrics = Boolean(song.lyrics?.trim());

  return (
    <>
      <div className="group relative flex min-w-0 max-w-full flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md overflow-hidden">
        <div className="space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <Link
              href={`/dashboard/songs/${song.id}`}
              prefetch={true}
              className="group-hover:text-primary transition-colors min-w-0 flex-1"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music2Icon className="size-3.5" />
                </span>
                <h3 className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
                  {song.title}
                </h3>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
                {song.artist || "Artista não informado"}
              </p>
            </Link>

            {canManage ? (
              isMobile ? (
                <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground"
                    >
                      <MoreVerticalIcon className="size-4" />
                      <span className="sr-only">Opções da música</span>
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80dvh] rounded-t-[24px] p-0">
                    <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Music2Icon className="size-4" />
                        </span>
                        <DrawerTitle className="font-heading text-base font-bold truncate">
                          {song.title}
                        </DrawerTitle>
                      </div>
                      <DrawerDescription className="text-xs text-muted-foreground truncate">
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
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground"
                    >
                      <MoreVerticalIcon className="size-4" />
                      <span className="sr-only">Opções da música</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/songs/${song.id}`} prefetch={true}>
                        <FileTextIcon className="size-4 mr-2" />
                        Ver detalhes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <PencilIcon className="size-4 mr-2" />
                      Editar música
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2Icon className="size-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : null}
          </div>

          {/* BADGES MUSICAIS: GRUPO, TOM, BPM, COMPASSO */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {song.collection ? (
              <Badge
                variant="outline"
                className="max-w-full gap-1 border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary truncate shrink-0"
              >
                <FolderIcon className="size-3 text-primary shrink-0" />
                <span className="truncate">{song.collection}</span>
              </Badge>
            ) : null}
            {song.tone ? (
              <Badge variant="outline" className="shrink-0 font-semibold text-primary">
                Tom {song.tone}
              </Badge>
            ) : null}
            {song.bpm ? (
              <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
                {song.bpm} BPM
              </Badge>
            ) : null}
            {song.timeSignature ? (
              <Badge variant="secondary" className="shrink-0 text-[11px]">
                {song.timeSignature}
              </Badge>
            ) : null}

            {hasChords ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <FileMusicIcon className="size-3" />
                Cifra
              </span>
            ) : null}

            {hasLyrics ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                <FileTextIcon className="size-3" />
                Letra
              </span>
            ) : null}
          </div>
        </div>

        {/* RODAPÉ COM LINKS PARA PLATAFORMAS */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {song.youtubeUrl ? (
              <a
                href={song.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                title="Abrir no YouTube"
              >
                <span>YouTube</span>
                <ExternalLinkIcon className="size-2.5" />
              </a>
            ) : null}

            {song.spotifyUrl ? (
              <a
                href={song.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                title="Abrir no Spotify"
              >
                <span>Spotify</span>
                <ExternalLinkIcon className="size-2.5" />
              </a>
            ) : null}

            {song.youtubeMusicUrl ? (
              <a
                href={song.youtubeMusicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-600/10 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-600/20 dark:text-red-300"
                title="Abrir no YouTube Music"
              >
                <span>YT Music</span>
                <ExternalLinkIcon className="size-2.5" />
              </a>
            ) : null}
          </div>

          <Link
            href={`/dashboard/songs/${song.id}`}
            prefetch={true}
            className="shrink-0 font-medium text-primary hover:underline text-xs ml-auto"
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
    </>
  );
}

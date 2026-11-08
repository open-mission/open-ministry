"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  Music2Icon,
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
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChordsViewer } from "./chords-viewer";

export type QuickDrawerSong = {
  id: string;
  title: string;
  artist?: string | null;
  tone?: string | null;
  bpm?: number | null;
  timeSignature?: string | null;
  chords?: string | null;
  lyrics?: string | null;
  youtubeUrl?: string | null;
  youtubeMusicUrl?: string | null;
  spotifyUrl?: string | null;
};

type SongQuickDrawerProps = {
  song: QuickDrawerSong | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SongQuickDrawer({
  song,
  open,
  onOpenChange,
}: SongQuickDrawerProps) {
  if (!song) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh] max-h-[92dvh] flex flex-col gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
        <DrawerHeader className="relative px-5 pt-3.5 pb-3 border-b text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Music2Icon className="size-4" />
            </span>
            <DrawerTitle className="font-heading text-xl tracking-tight">
              {song.title}
            </DrawerTitle>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
            {song.artist || "Artista não informado"}
          </DrawerDescription>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
            {song.tone ? (
              <Badge variant="outline" className="font-semibold text-primary">
                Tom: {song.tone}
              </Badge>
            ) : null}
            {song.bpm ? (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {song.bpm} BPM
              </Badge>
            ) : null}
            {song.timeSignature ? (
              <Badge variant="secondary" className="text-[10px]">
                {song.timeSignature}
              </Badge>
            ) : null}

            {song.youtubeUrl ? (
              <a
                href={song.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400"
              >
                YouTube
                <ExternalLinkIcon className="size-2.5" />
              </a>
            ) : null}

            {song.spotifyUrl ? (
              <a
                href={song.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
              >
                Spotify
                <ExternalLinkIcon className="size-2.5" />
              </a>
            ) : null}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue={song.chords ? "cifra" : "letra"} className="w-full">
            <TabsList className="h-9 mb-3">
              <TabsTrigger value="cifra" className="gap-1.5 text-xs">
                <FileMusicIcon className="size-3.5" />
                Cifra & Transposição
              </TabsTrigger>
              <TabsTrigger value="letra" className="gap-1.5 text-xs">
                <FileTextIcon className="size-3.5" />
                Letra
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cifra" className="pt-1">
              {song.chords?.trim() ? (
                <ChordsViewer chords={song.chords} originalTone={song.tone} />
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Nenhuma cifra registrada para esta música.
                </div>
              )}
            </TabsContent>

            <TabsContent value="letra" className="pt-1">
              {song.lyrics?.trim() ? (
                <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-6 text-sm leading-loose whitespace-pre-line text-foreground">
                  {song.lyrics}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Nenhuma letra registrada para esta música.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="flex flex-row items-center justify-between border-t bg-background px-4 py-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/songs/${song.id}`}>
              Ver página completa da música ›
            </Link>
          </Button>

          <DrawerClose asChild>
            <Button size="sm">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

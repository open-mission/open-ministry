"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  HeadphonesIcon,
  Music2Icon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";
import { ChordsViewer } from "./chords-viewer";
import { getStreamingLinks, streamingLinkLabel } from "./song-streaming-links";
import { SongLyricsViewer } from "./song-lyrics-viewer";

export type QuickDrawerSong = {
  id: string;
  title: string;
  artist?: string | null;
  tone?: string | null;
  capo?: number | null;
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
  const streamingLinks = getStreamingLinks(song);

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
            {song.capo && song.capo > 0 ? (
              <Badge variant="secondary" className="text-[10px]">
                Capo {song.capo}
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

            {streamingLinks.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2.5 text-[10px]"
                    aria-label="Links de áudio da música"
                  >
                    <HeadphonesIcon className="size-3" />
                    Ouvir
                  </Button>
                </DropdownMenuTrigger>
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
            ) : null}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue={song.chords ? "cifra" : "letra"} className="w-full">
            <TabsList className="mb-3 h-9 w-full justify-start overflow-x-auto scrollbar-none sm:w-fit">
              <TabsTrigger
                value="cifra"
                className="shrink-0 gap-1.5 text-xs"
              >
                <FileMusicIcon className="size-3.5" />
                Cifra & Transposição
              </TabsTrigger>
              <TabsTrigger
                value="letra"
                className="shrink-0 gap-1.5 text-xs"
              >
                <FileTextIcon className="size-3.5" />
                Letra
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cifra" className="pt-1">
              {song.chords?.trim() ? (
                <ChordsViewer
                  chords={song.chords}
                  originalTone={song.tone}
                  capo={song.capo}
                  songTitle={song.title}
                  songArtist={song.artist ?? undefined}
                />
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Nenhuma cifra registrada para esta música.
                </div>
              )}
            </TabsContent>

            <TabsContent value="letra" className="pt-1">
              <SongLyricsViewer lyrics={song.lyrics ?? ""} />
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="flex flex-row items-center justify-between border-t bg-background px-4 py-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/songs/${song.id}`} prefetch={true}>
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

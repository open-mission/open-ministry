"use client";

import { Music2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChordsViewer } from "@/features/songs/components/chords-viewer";
import { useIsMobile } from "@/hooks/use-mobile";

export type SongChordsSheetSong = {
  title: string;
  artist?: string | null;
  tone?: string | null;
  capo?: number | null;
  chords?: string | null;
};

type SongChordsSheetProps = {
  song: SongChordsSheetSong | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SongChordsHeader({
  song,
  onClose,
}: {
  song: SongChordsSheetSong;
  onClose: () => void;
}) {
  const tone = song.tone?.trim();
  const capo = Number(song.capo) || 0;

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Music2Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-heading text-base font-bold tracking-tight text-foreground">
          {song.title}
        </h2>
        <p className="truncate text-xs text-muted-foreground">
          {song.artist?.trim() || "Artista não informado"}
          {tone ? ` · Tom ${tone}` : ""}
          {capo > 0 ? ` · Capo ${capo}` : ""}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Fechar cifra"
        title="Fechar cifra"
        className="size-11 shrink-0 text-muted-foreground hover:text-foreground sm:size-9"
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );
}

export function SongChordsSheet({
  song,
  open,
  onOpenChange,
}: SongChordsSheetProps) {
  const isMobile = useIsMobile();

  if (!song) return null;

  const hasChords = Boolean(song.chords?.trim());

  const content = hasChords ? (
    <ChordsViewer
      chords={song.chords ?? ""}
      originalTone={song.tone}
      capo={song.capo ?? 0}
      songTitle={song.title}
      songArtist={song.artist ?? undefined}
      hideFullscreenButton
    />
  ) : (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Music2Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">
        Cifra não cadastrada para esta música
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        A liderança ainda não adicionou os acordes desta música ao repertório.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col gap-0 rounded-none border-0 bg-background p-0 !mt-0 !max-h-[100dvh] !rounded-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none">
          <DrawerHeader className="shrink-0 border-b border-border/70 bg-background px-4 pt-3 pb-3 !text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="sr-only">{song.title}</DrawerTitle>
            <DrawerDescription className="sr-only">
              Cifra e transposição da música {song.title}.
            </DrawerDescription>
            <SongChordsHeader
              song={song}
              onClose={() => onOpenChange(false)}
            />
          </DrawerHeader>

          <div
            data-vaul-no-drag=""
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-4 [-webkit-overflow-scrolling:touch]"
          >
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border/70 px-6 py-4 text-left">
          <SheetTitle className="sr-only">{song.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Cifra e transposição da música {song.title}.
          </SheetDescription>
          <SongChordsHeader song={song} onClose={() => onOpenChange(false)} />
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import { FileMusicIcon, FileTextIcon, Music2Icon, XIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChordsViewer } from "@/features/songs/components/chords-viewer";
import { DepartmentArrangementPicker } from "@/features/songs/components/department-arrangement-picker";
import { SongLyricsViewer } from "@/features/songs/components/song-lyrics-viewer";
import { useSongArrangements } from "@/features/songs/hooks/use-song-arrangements";
import { useStableIsMobile } from "@/hooks/use-stable-is-mobile";

export type SongChordsSheetSong = {
  id?: string;
  title: string;
  artist?: string | null;
  tone?: string | null;
  capo?: number | null;
  bpm?: number | null;
  chords?: string | null;
  lyrics?: string | null;
  collection?: string | null;
  tags?: string[] | null;
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
  const artist = song.artist?.trim();
  const tone = song.tone?.trim();
  const collection = song.collection?.trim();
  const capo = Number(song.capo) || 0;
  const bpm = Number(song.bpm) || 0;
  const tags = (song.tags ?? []).map((tag) => tag.trim()).filter(Boolean);

  const details = [
    artist,
    tone ? `Tom ${tone}` : null,
    capo > 0 ? `Capo ${capo}` : null,
    collection ? `Coleção: ${collection}` : null,
    tags.length > 0 ? `Tags: ${tags.join(", ")}` : null,
    bpm > 0 ? `${bpm} BPM` : null,
  ].filter((detail): detail is string => Boolean(detail));

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Music2Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-heading text-base font-bold tracking-tight text-foreground">
          {song.title}
        </h2>
        {details.length > 0 ? (
          <p className="truncate text-xs text-muted-foreground">
            {details.join(" · ")}
          </p>
        ) : null}
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

function ViewerEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function SongChordsSheet({
  song,
  open,
  onOpenChange,
}: SongChordsSheetProps) {
  const isMobile = useStableIsMobile(open);
  const { departments } = useSongArrangements(song?.id ?? null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const selectedDepartment =
    departments.find(
      (department) => department.departmentId === selectedDepartmentId,
    ) ??
    departments[0] ??
    null;

  if (!song) return null;

  const sectionNotes = selectedDepartment?.notes;
  const hasChords = Boolean(song.chords?.trim());
  const hasLyrics = Boolean(song.lyrics?.trim());

  const departmentPicker =
    departments.length > 1 ? (
      <div className="mb-3 flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-muted-foreground">
          Departamento
        </span>
        <DepartmentArrangementPicker
          id="rehearsal-sheet-department"
          departments={departments.map((department) => ({
            id: department.departmentId,
            name: department.departmentName,
          }))}
          value={selectedDepartment?.departmentId ?? ""}
          onChange={setSelectedDepartmentId}
          className="min-w-0 flex-1"
        />
      </div>
    ) : null;

  const content =
    hasChords || hasLyrics ? (
      <Tabs defaultValue="cifra" className="w-full min-w-0 gap-3">
        <TabsList className="h-11 w-full max-w-full justify-start overflow-x-auto scrollbar-none sm:w-fit">
          <TabsTrigger
            value="cifra"
            className="min-h-9 shrink-0 gap-1.5 px-3 text-xs sm:text-sm"
          >
            <FileMusicIcon className="size-4 shrink-0" aria-hidden />
            Cifra
          </TabsTrigger>
          <TabsTrigger
            value="letra"
            className="min-h-9 shrink-0 gap-1.5 px-3 text-xs sm:text-sm"
          >
            <FileTextIcon className="size-4 shrink-0" aria-hidden />
            Letra
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cifra" className="pt-1">
          {hasChords ? (
            <ChordsViewer
              chords={song.chords ?? ""}
              originalTone={song.tone}
              capo={song.capo ?? 0}
              songTitle={song.title}
              songArtist={song.artist ?? undefined}
              hideFullscreenButton
              sectionNotes={sectionNotes}
              canEditNotes={false}
            />
          ) : (
            <ViewerEmptyState
              icon={FileMusicIcon}
              title="Cifra não cadastrada para esta música"
              description="A liderança ainda não adicionou os acordes desta música ao repertório."
            />
          )}
        </TabsContent>

        <TabsContent value="letra" className="pt-1">
          {hasLyrics ? (
            <SongLyricsViewer
              lyrics={song.lyrics ?? ""}
              sectionNotes={sectionNotes}
            />
          ) : (
            <ViewerEmptyState
              icon={FileTextIcon}
              title="Letra não cadastrada para esta música"
              description="A liderança ainda não adicionou a letra desta música ao repertório."
            />
          )}
        </TabsContent>
      </Tabs>
    ) : (
      <ViewerEmptyState
        icon={Music2Icon}
        title="Cifra e letra não cadastradas para esta música"
        description="A liderança ainda não adicionou os acordes ou a letra desta música ao repertório."
      />
    );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col gap-0 rounded-none border-0 bg-background p-0 !mt-0 !max-h-[100dvh] !rounded-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none">
          <DrawerHeader className="shrink-0 border-b border-border/70 bg-background px-4 pt-3 pb-3 !text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="sr-only">{song.title}</DrawerTitle>
            <DrawerDescription className="sr-only">
              Cifra, letra e transposição da música {song.title}.
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
            {departmentPicker}
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
            Cifra, letra e transposição da música {song.title}.
          </SheetDescription>
          <SongChordsHeader song={song} onClose={() => onOpenChange(false)} />
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {departmentPicker}
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}

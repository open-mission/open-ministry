"use client";

import { useState } from "react";
import {
  FileMusicIcon,
  FileTextIcon,
  InfoIcon,
  Music2Icon,
  PlusIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DepartmentArrangement } from "@/features/songs/lib/song-arrangements";
import { useSongQuery } from "@/hooks/use-songs";
import { EMPTY_SONG_USAGE } from "@/lib/song-usage";
import type { SongWithDetails } from "@/lib/songs";
import { ChordsViewer } from "./chords-viewer";
import { SongDetailContextPanel } from "./song-detail/song-detail-context-panel";
import { SongDetailHeaderActions } from "./song-detail-header-actions";
import { SongFormDialog } from "./song-form-dialog";
import { SongLyricsViewer } from "./song-lyrics-viewer";

type SongDetailViewProps = {
  initialSong: SongWithDetails;
  songId: string;
  canUpdate: boolean;
  canDelete: boolean;
  canAddToNextService: boolean;
  /** Notas e formação por departamento, já filtradas pelo servidor. */
  initialArrangements?: DepartmentArrangement[];
};

export function SongDetailView({
  initialSong,
  songId,
  canUpdate,
  canDelete,
  canAddToNextService,
  initialArrangements = [],
}: SongDetailViewProps) {
  const { data } = useSongQuery(songId, {
    initialData: { song: initialSong },
  });

  const song = data?.song ?? initialSong;
  const usage = song.usage ?? EMPTY_SONG_USAGE;
  const hasChords = Boolean(song.chords?.trim());
  const hasLyrics = Boolean(song.lyrics?.trim());

  const [activeTab, setActiveTab] = useState<string>(
    hasChords ? "cifra" : hasLyrics ? "letra" : "cifra",
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [editorState, setEditorState] = useState<{
    open: boolean;
    tab: "notas-banda" | "cifra";
  }>({ open: false, tab: "notas-banda" });

  const selectedDepartment =
    initialArrangements.find(
      (department) => department.departmentId === selectedDepartmentId,
    ) ??
    initialArrangements[0] ??
    null;

  const handleEditNote = () =>
    setEditorState({ open: true, tab: "notas-banda" });

  const handleAddChords = () => setEditorState({ open: true, tab: "cifra" });

  const sectionNotes = selectedDepartment?.notes;
  const formationNames = (selectedDepartment?.functions ?? [])
    .filter((fn) => selectedDepartment?.selectedFunctionIds.includes(fn.id))
    .map((fn) => fn.name);

  const contextPanel = (
    <SongDetailContextPanel
      song={song}
      usage={usage}
      initialArrangements={initialArrangements}
      selectedDepartment={selectedDepartment}
      onSelectDepartment={setSelectedDepartmentId}
      formationNames={formationNames}
      canUpdate={canUpdate}
      onEditNote={() => {
        setInfoDrawerOpen(false);
        handleEditNote();
      }}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
      {/* CABEÇALHO COMPACTO — ACORDES ACIMA DA DOBRA */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3.5">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 hidden size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <Music2Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="line-clamp-2 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              {song.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span className="truncate font-medium">
                {song.artist || "Artista não informado"}
              </span>
              {song.tone ? (
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold text-primary"
                >
                  Tom {song.tone}
                </Badge>
              ) : null}
              {song.bpm ? (
                <span className="font-mono text-xs">{song.bpm} BPM</span>
              ) : null}
              {song.timeSignature ? (
                <span className="text-xs">· {song.timeSignature}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInfoDrawerOpen(true)}
            aria-label="Ver informações, referências e histórico da música"
            className="min-h-11 gap-1.5 px-3 text-xs font-medium lg:hidden"
          >
            <InfoIcon className="size-3.5" />
            <span>Info</span>
          </Button>

          <SongDetailHeaderActions
            song={song}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canAddToNextService={canAddToNextService}
          />
        </div>
      </header>

      {/* LAYOUT 2 COLUNAS NO DESKTOP (LEITOR PROTAGONISTA + CONTEXTO LATERAL) */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full min-w-0"
          >
            <TabsList className="h-10 w-full justify-start sm:w-fit">
              <TabsTrigger
                value="cifra"
                className="flex-1 gap-1.5 px-3 text-xs sm:flex-initial sm:text-sm"
              >
                <FileMusicIcon className="size-4 shrink-0" />
                <span>Cifra</span>
              </TabsTrigger>
              <TabsTrigger
                value="letra"
                className="flex-1 gap-1.5 px-3 text-xs sm:flex-initial sm:text-sm"
              >
                <FileTextIcon className="size-4 shrink-0" />
                <span>Letra</span>
                <span className="hidden sm:inline text-muted-foreground">
                  (com Palco)
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cifra" className="pt-3">
              {hasChords ? (
                <ChordsViewer
                  chords={song.chords ?? ""}
                  originalTone={song.tone}
                  capo={song.capo}
                  songTitle={song.title}
                  songArtist={song.artist ?? undefined}
                  sectionNotes={sectionNotes}
                  canEditNotes={canUpdate}
                  onEditNote={canUpdate ? handleEditNote : undefined}
                />
              ) : (
                <Card className="space-y-3 p-6 text-center">
                  <FileMusicIcon className="mx-auto size-8 text-muted-foreground/60" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Cifra ainda não adicionada
                    </p>
                    <p className="mx-auto max-w-md text-xs text-muted-foreground">
                      {hasLyrics
                        ? "A letra já está disponível para cantores. Cole ou importe a cifra para liberar transposição e modo palco."
                        : "Adicione a cifra com acordes para liberar transposição, 2 colunas e modo palco."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {canUpdate ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddChords}
                        className="min-h-11 gap-1.5 px-3.5 text-xs font-semibold sm:min-h-9"
                      >
                        <PlusIcon className="size-3.5" />
                        <span>Adicionar cifra</span>
                      </Button>
                    ) : null}
                    {hasLyrics ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("letra")}
                        className="min-h-11 px-3.5 text-xs font-medium sm:min-h-9"
                      >
                        Ver Letra
                      </Button>
                    ) : null}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="letra" className="pt-3">
              <SongLyricsViewer
                lyrics={song.lyrics ?? ""}
                sectionNotes={sectionNotes}
                songTitle={song.title}
                songArtist={song.artist ?? undefined}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* LATERAL STICKY NO DESKTOP */}
        <aside className="hidden lg:sticky lg:top-4 lg:block">
          {contextPanel}
        </aside>
      </div>

      {/* DRAWER INFO NO MOBILE (PADRÃO @openministry/ui) */}
      <Drawer open={infoDrawerOpen} onOpenChange={setInfoDrawerOpen}>
        <DrawerContent className="max-h-[85dvh] rounded-t-xl bg-popover">
          <DrawerHeader className="border-b border-border/60 pb-3 text-left! group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="font-heading text-base font-bold">
              Detalhes &amp; Referências
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {song.title}
              {song.artist ? ` · ${song.artist}` : ""}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
            {contextPanel}
          </div>
        </DrawerContent>
      </Drawer>

      {canUpdate && editorState.open ? (
        <SongFormDialog
          open={editorState.open}
          onOpenChange={(open) =>
            setEditorState((prev) => ({ ...prev, open }))
          }
          songId={song.id}
          initialTab={editorState.tab}
          initialDepartmentId={selectedDepartment?.departmentId}
          canUpdate={canUpdate}
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
        />
      ) : null}
    </div>
  );
}

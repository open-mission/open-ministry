"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  HeadphonesIcon,
  Music2Icon,
  SearchIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DepartmentArrangement } from "@/features/songs/lib/song-arrangements";
import { useSongQuery } from "@/hooks/use-songs";
import { formatDate } from "@/lib/format";
import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";
import { EMPTY_SONG_USAGE } from "@/lib/song-usage";
import type { SongWithDetails } from "@/lib/songs";
import { ChordsViewer } from "./chords-viewer";
import { DepartmentArrangementPicker } from "./department-arrangement-picker";
import { SongDetailHeaderActions } from "./song-detail-header-actions";
import { SongFormDialog } from "./song-form-dialog";
import { SongLyricsViewer } from "./song-lyrics-viewer";
import { getStreamingLinks, streamingLinkLabel } from "./song-streaming-links";
import { SongTagsList } from "./song-tags-list";

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
  const streamingLinks = getStreamingLinks(song);
  const planItems = song.planItems ?? [];
  const nextEvent = usage.nextEvent;
  const lastEvent = usage.lastEvent;
  const hasHistory = planItems.length > 0 || usage.eventCount > 0;
  const serviceCount = usage.eventCount || planItems.length;
  const defaultTab = song.chords?.trim()
    ? "cifra"
    : song.lyrics?.trim()
      ? "letra"
      : hasHistory
        ? "cultos"
        : "cifra";

  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const selectedDepartment =
    initialArrangements.find(
      (department) => department.departmentId === selectedDepartmentId,
    ) ??
    initialArrangements[0] ??
    null;

  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const handleEditNote = () => setNoteEditorOpen(true);

  const sectionNotes = selectedDepartment?.notes;
  const formationNames = (selectedDepartment?.functions ?? [])
    .filter((fn) => selectedDepartment?.selectedFunctionIds.includes(fn.id))
    .map((fn) => fn.name);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 min-w-0">
      {/* HEADER DA MÚSICA */}
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Music2Icon className="size-4" />
              </span>
              <h1 className="line-clamp-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {song.title}
              </h1>
            </div>

            <p className="truncate text-sm text-muted-foreground sm:text-base">
              {song.artist || "Artista não informado"}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {song.tone ? (
                <Badge variant="outline" className="font-semibold text-primary">
                  Tom: {song.tone}
                </Badge>
              ) : null}
              {song.capo > 0 ? (
                <Badge variant="secondary">Capo {song.capo}</Badge>
              ) : null}
              {song.bpm ? (
                <Badge variant="secondary" className="font-mono">
                  {song.bpm} BPM
                </Badge>
              ) : null}
              {song.timeSignature ? (
                <Badge variant="secondary">Compasso: {song.timeSignature}</Badge>
              ) : null}
            </div>

            {/* HISTÓRICO DE USO NOS CULTOS */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <CalendarDaysIcon className="size-3.5 shrink-0" />
                {nextEvent ? (
                  <span className="truncate">
                    Próximo:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(nextEvent.startsAt)}
                    </span>{" "}
                    · {nextEvent.eventTitle}
                  </span>
                ) : lastEvent ? (
                  <span className="truncate">
                    Último:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(lastEvent.startsAt)}
                    </span>{" "}
                    · {lastEvent.eventTitle}
                  </span>
                ) : (
                  <span>Nunca usada em cultos</span>
                )}
              </span>

              {nextEvent && lastEvent ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <CalendarDaysIcon className="size-3.5 shrink-0 opacity-60" />
                  <span className="truncate">
                    Último: {formatDate(lastEvent.startsAt)} ·{" "}
                    {lastEvent.eventTitle}
                  </span>
                </span>
              ) : null}

              {serviceCount > 0 ? (
                <span>
                  {serviceCount} culto{serviceCount === 1 ? "" : "s"} distinto
                  {serviceCount === 1 ? "" : "s"}
                </span>
              ) : null}

              {nextEvent?.responsible ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <UserRoundIcon className="size-3.5 shrink-0" />
                  <span className="truncate">
                    Responsável: {nextEvent.responsible}
                  </span>
                </span>
              ) : null}
            </div>

            {/* TAGS DA MÚSICA (MAX 3 + DIALOG/DRAWER) */}
            <SongTagsList tags={song.tags ?? []} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SongDetailHeaderActions
              song={song}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canAddToNextService={canAddToNextService}
            />
          </div>
        </div>

        {/* LINKS DE STREAMING CONSOLIDADOS */}
        {streamingLinks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-medium"
                  aria-label="Links de áudio da música"
                >
                  <HeadphonesIcon className="size-3.5" />
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
          </div>
        ) : null}
      </header>

      {/* NOTAS E FORMAÇÃO POR DEPARTAMENTO */}
      {selectedDepartment ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersRoundIcon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground sm:text-sm">
                Notas &amp; Banda
              </p>
              {formationNames.length > 0 ? (
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  Formação: {formationNames.join(", ")}
                </p>
              ) : null}
            </div>
          </div>

          {initialArrangements.length > 1 ? (
            <div className="flex items-center gap-2 sm:shrink-0">
              <span className="text-[11px] text-muted-foreground sm:text-xs">
                Departamento
              </span>
              <DepartmentArrangementPicker
                id="song-viewer-department"
                departments={initialArrangements.map((department) => ({
                  id: department.departmentId,
                  name: department.departmentName,
                }))}
                value={selectedDepartment.departmentId}
                onChange={setSelectedDepartmentId}
                className="sm:w-52"
              />
            </div>
          ) : (
            <Badge variant="secondary" className="w-fit shrink-0 text-[11px]">
              {selectedDepartment.departmentName}
            </Badge>
          )}
        </div>
      ) : null}

      {/* ABAS DE CIFRA, LETRA E HISTÓRICO */}
      <Tabs defaultValue={defaultTab} className="w-full min-w-0">
        <TabsList className="h-10 w-full max-w-full justify-start overflow-x-auto scrollbar-none sm:w-fit">
          <TabsTrigger
            value="cifra"
            className="shrink-0 gap-1.5 px-2.5 text-xs sm:text-sm"
          >
            <FileMusicIcon className="size-4 shrink-0" />
            <span>Cifra &amp; Transposição</span>
          </TabsTrigger>
          <TabsTrigger
            value="letra"
            className="shrink-0 gap-1.5 px-2.5 text-xs sm:text-sm"
          >
            <FileTextIcon className="size-4 shrink-0" />
            <span>Letra</span>
            <span className="hidden sm:inline">Completa</span>
          </TabsTrigger>
          {hasHistory ? (
            <TabsTrigger
              value="cultos"
              className="shrink-0 gap-1.5 px-2.5 text-xs sm:text-sm"
            >
              <CalendarDaysIcon className="size-4 shrink-0" />
              <span>Cultos ({serviceCount})</span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        {/* CONTEÚDO DA CIFRA */}
        <TabsContent value="cifra" className="pt-4">
          {song.chords?.trim() ? (
            <ChordsViewer
              chords={song.chords}
              originalTone={song.tone}
              capo={song.capo}
              songTitle={song.title}
              songArtist={song.artist ?? undefined}
              sectionNotes={sectionNotes}
              canEditNotes={canUpdate}
              onEditNote={canUpdate ? handleEditNote : undefined}
            />
          ) : (
            <Card className="p-8 text-center">
              <FileMusicIcon className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">Nenhuma cifra cadastrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique em Editar para colar a cifra com acordes e tablaturas.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* CONTEÚDO DA LETRA */}
        <TabsContent value="letra" className="pt-4">
          <SongLyricsViewer
            lyrics={song.lyrics ?? ""}
            sectionNotes={sectionNotes}
          />
        </TabsContent>

        {/* CONTEÚDO DOS CULTOS RECENTES */}
        {hasHistory ? (
          <TabsContent value="cultos" className="pt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {usage.planItemCount > planItems.length
                  ? `Exibindo os ${planItems.length} momentos mais recentes de ${usage.eventCount} cultos distintos.`
                  : "Cultos e momentos recentes em que esta música foi agendada no cronograma:"}
              </p>
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card">
                {planItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.event?.title ?? "Culto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.event?.startsAt
                          ? formatDate(item.event.startsAt)
                          : ""}{" "}
                        · Momento: {item.title}
                        {item.responsible
                          ? ` · Responsável: ${item.responsible}`
                          : ""}
                      </p>
                    </div>
                    {item.event ? (
                      <Link
                        href={`/events/${item.event.id}`}
                        className="shrink-0 rounded-md text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Ver culto ›
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      {canUpdate && noteEditorOpen ? (
        <SongFormDialog
          open={noteEditorOpen}
          onOpenChange={setNoteEditorOpen}
          songId={song.id}
          initialTab="notas-banda"
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

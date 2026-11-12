"use client";

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
import { useSongQuery } from "@/hooks/use-songs";
import { formatDate } from "@/lib/format";
import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";
import { EMPTY_SONG_USAGE } from "@/lib/song-usage";
import type { SongWithDetails } from "@/lib/songs";
import { ChordsViewer } from "./chords-viewer";
import { SongDetailHeaderActions } from "./song-detail-header-actions";
import { SongLyricsViewer } from "./song-lyrics-viewer";
import { getStreamingLinks, streamingLinkLabel } from "./song-streaming-links";
import { SongTagsList } from "./song-tags-list";

type SongDetailViewProps = {
  initialSong: SongWithDetails;
  songId: string;
  canUpdate: boolean;
  canDelete: boolean;
  canAddToNextService: boolean;
};

export function SongDetailView({
  initialSong,
  songId,
  canUpdate,
  canDelete,
  canAddToNextService,
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

      {/* ABAS DE CIFRA, LETRA E HISTÓRICO */}
      <Tabs defaultValue={defaultTab} className="w-full min-w-0">
        <TabsList className="h-10 w-full max-w-full justify-start overflow-x-auto scrollbar-none sm:w-fit">
          <TabsTrigger
            value="cifra"
            className="shrink-0 gap-1.5 px-2.5 text-xs sm:text-sm"
          >
            <FileMusicIcon className="size-4 shrink-0" />
            <span>Cifra</span>
            <span className="hidden sm:inline">com Transposição</span>
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
          <SongLyricsViewer lyrics={song.lyrics ?? ""} />
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
                        href={`/dashboard/events/${item.event.id}`}
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
    </div>
  );
}

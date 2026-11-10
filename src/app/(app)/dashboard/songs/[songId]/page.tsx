import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileMusicIcon,
  FileTextIcon,
  Music2Icon,
} from "lucide-react";

import { ChordsViewer } from "@/components/songs/chords-viewer";
import { SongDetailHeaderActions } from "@/components/songs/song-detail-header-actions";
import { SongLyricsViewer } from "@/components/songs/song-lyrics-viewer";
import { SongTagsList } from "@/components/songs/song-tags-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { getSong } from "@/lib/songs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalhes da Música",
};

export default function SongDetailPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  return (
    <Suspense fallback={<SongDetailSkeleton />}>
      <SongDetailContent params={params} />
    </Suspense>
  );
}

async function SongDetailContent({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  await connection();

  const { songId } = await params;
  const { organization } = await requireOrganizationContext();

  const [hasAccess, canUpdate, canDelete] = await Promise.all([
    can("music", "read"),
    can("music", "updateSong"),
    can("music", "deleteSong"),
  ]);
  if (!hasAccess) {
    notFound();
  }

  const song = await getSong(organization.id, songId);
  if (!song) {
    notFound();
  }

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
              <h1 className="truncate font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
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
              {song.bpm ? (
                <Badge variant="secondary" className="font-mono">
                  {song.bpm} BPM
                </Badge>
              ) : null}
              {song.timeSignature ? (
                <Badge variant="secondary">Compasso: {song.timeSignature}</Badge>
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
            />
          </div>
        </div>

        {/* LINKS DE STREAMING */}
        {(song.youtubeUrl || song.spotifyUrl || song.youtubeMusicUrl) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {song.youtubeUrl ? (
              <a
                href={song.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
              >
                <span>YouTube</span>
                <ExternalLinkIcon className="size-3" />
              </a>
            ) : null}

            {song.spotifyUrl ? (
              <a
                href={song.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                <span>Spotify</span>
                <ExternalLinkIcon className="size-3" />
              </a>
            ) : null}

            {song.youtubeMusicUrl ? (
              <a
                href={song.youtubeMusicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-600/20 dark:text-red-300"
              >
                <span>YT Music</span>
                <ExternalLinkIcon className="size-3" />
              </a>
            ) : null}
          </div>
        )}
      </header>

      {/* ABAS DE CIFRA E LETRA */}
      <Tabs defaultValue={song.chords ? "cifra" : "letra"} className="w-full min-w-0">
        <TabsList
          className={cn(
            "h-10 w-full max-w-full overflow-x-auto scrollbar-none sm:w-fit sm:inline-flex",
            song.planItems && song.planItems.length > 0
              ? "grid grid-cols-3 sm:flex"
              : "grid grid-cols-2 sm:flex",
          )}
        >
          <TabsTrigger value="cifra" className="gap-1.5 px-2.5 text-xs sm:text-sm">
            <FileMusicIcon className="size-4 shrink-0" />
            <span>Cifra</span>
            <span className="hidden sm:inline">com Transposição</span>
          </TabsTrigger>
          <TabsTrigger value="letra" className="gap-1.5 px-2.5 text-xs sm:text-sm">
            <FileTextIcon className="size-4 shrink-0" />
            <span>Letra</span>
            <span className="hidden sm:inline">Completa</span>
          </TabsTrigger>
          {song.planItems && song.planItems.length > 0 ? (
            <TabsTrigger value="cultos" className="gap-1.5 px-2.5 text-xs sm:text-sm">
              <CalendarDaysIcon className="size-4 shrink-0" />
              <span>Cultos ({song.planItems.length})</span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        {/* CONTEÚDO DA CIFRA */}
        <TabsContent value="cifra" className="pt-4">
          {song.chords?.trim() ? (
            <ChordsViewer
              chords={song.chords}
              originalTone={song.tone}
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
        {song.planItems && song.planItems.length > 0 ? (
          <TabsContent value="cultos" className="pt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Cultos e momentos recentes em que esta música foi agendada no
                cronograma:
              </p>
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card">
                {song.planItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.event?.title ?? "Culto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.event?.startsAt
                          ? formatDate(item.event.startsAt)
                          : ""}{" "}
                        · Momento: {item.title}
                      </p>
                    </div>
                    {item.event ? (
                      <Link
                        href={`/dashboard/events/${item.event.id}`}
                        className="text-xs font-medium text-primary hover:underline"
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

function SongDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 min-w-0" aria-hidden>
      <div className="space-y-2 border-b border-border/60 pb-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

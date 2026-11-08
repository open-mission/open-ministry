"use client";

import { useMemo, useState } from "react";
import {
  FileMusicIcon,
  FileTextIcon,
  Music2Icon,
  SearchIcon,
} from "lucide-react";

import { StatStrip, type StatItem } from "@/components/app/stat-strip";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { STANDARD_TONES } from "@/lib/music/chords-utils";
import type { SongRecord } from "@/lib/songs";
import { AddSongChoiceDialog } from "./add-song-choice-dialog";
import { SongCard } from "./song-card";

type SongsListViewProps = {
  songs: SongRecord[];
  canManage?: boolean;
};

export function SongsListView({ songs, canManage = true }: SongsListViewProps) {
  const [search, setSearch] = useState("");
  const [toneFilter, setToneFilter] = useState("");

  const filteredSongs = useMemo(() => {
    let result = songs;

    if (toneFilter) {
      result = result.filter((s) => s.tone === toneFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q)) ||
          s.tone?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [songs, search, toneFilter]);

  const statsItems: StatItem[] = useMemo(() => {
    const withChords = songs.filter((s) => Boolean(s.chords?.trim())).length;
    const withLyrics = songs.filter((s) => Boolean(s.lyrics?.trim())).length;

    return [
      {
        icon: Music2Icon,
        label: "Músicas",
        value: songs.length,
        hint: "No repertório da igreja",
      },
      {
        icon: FileMusicIcon,
        label: "Com Cifra",
        value: withChords,
        hint: "Prontas para tocar",
      },
      {
        icon: FileTextIcon,
        label: "Com Letra",
        value: withLyrics,
        hint: "Com texto completo",
      },
    ];
  }, [songs]);

  return (
    <div className="space-y-6">
      {/* STATS STRIP */}
      <StatStrip items={statsItems} />

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, artista, tom ou tag..."
              className="pl-9 h-10"
            />
          </div>

          <div className="w-36 shrink-0">
            <NativeSelect
              value={toneFilter}
              onChange={(e) => setToneFilter(e.target.value)}
              className="h-10"
            >
              <option value="">Todos os tons</option>
              {STANDARD_TONES.map((t) => (
                <option key={t} value={t}>
                  Tom {t}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {canManage ? <AddSongChoiceDialog /> : null}
      </div>

      {/* GRID DE MÚSICAS */}
      {filteredSongs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} canManage={canManage} />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 text-center sm:p-12">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Music2Icon className="size-7" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight">
            Nenhuma música no repertório
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Cadastre as músicas da igreja para organizar letras, cifras, links e
            vincular aos momentos dos cultos e momentos de louvor.
          </p>
          <div className="mt-5">
            {canManage ? <AddSongChoiceDialog /> : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Nenhuma música encontrada para os filtros aplicados
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tente pesquisar com outros termos ou limpar o filtro de tom.
          </p>
          {(search || toneFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setToneFilter("");
              }}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

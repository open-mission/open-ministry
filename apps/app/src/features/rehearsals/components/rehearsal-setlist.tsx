"use client";

import { useId, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Music2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RehearsalSongPicker } from "@/features/rehearsals/components/rehearsal-song-picker";
import type {
  RehearsalSongDraft,
  RehearsalSongOption,
} from "@/features/rehearsals/lib/rehearsal-ui";

type RehearsalSetlistProps = {
  songs: RehearsalSongOption[];
  entries: RehearsalSongDraft[];
  onChange: (entries: RehearsalSongDraft[]) => void;
  disabled?: boolean;
  idPrefix: string;
};

export function RehearsalSetlist({
  songs,
  entries,
  onChange,
  disabled = false,
  idPrefix,
}: RehearsalSetlistProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const fieldId = useId();
  const songsById = new Map(songs.map((song) => [song.id, song]));

  const updateEntry = (songId: string, patch: Partial<RehearsalSongDraft>) => {
    onChange(
      entries.map((entry) =>
        entry.songId === songId ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const removeEntry = (songId: string) => {
    onChange(entries.filter((entry) => entry.songId !== songId));
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    onChange(next);
  };

  const handleConfirmSongs = (songIds: string[]) => {
    const existing = new Map(entries.map((entry) => [entry.songId, entry]));
    onChange(
      songIds.map(
        (songId) => existing.get(songId) ?? { songId, musicalKey: null, notes: null },
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Repertório do ensaio</p>
          <p className="text-xs text-muted-foreground">
            Escolha as músicas e ajuste o tom de cada uma.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Music2Icon className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Nenhuma música no repertório</p>
            <p className="text-xs text-muted-foreground">
              Adicione as músicas que serão ensaiadas para a equipe se preparar.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            disabled={disabled}
            className="min-h-11"
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar músicas
          </Button>
        </div>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, index) => {
            const song = songsById.get(entry.songId);
            const title = song?.title ?? "Música removida";
            const inputId = `${idPrefix}-${fieldId}-${entry.songId}`;

            return (
              <li
                key={entry.songId}
                className="rounded-xl border border-border/70 bg-card p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {title}
                      </span>
                      {song?.tone ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Tom original {song.tone}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {song?.artist || "Artista não informado"}
                      {song?.collection ? ` · ${song.collection}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveEntry(index, -1)}
                      disabled={disabled || index === 0}
                      aria-label={`Mover ${title} para cima`}
                      className="size-9"
                    >
                      <ArrowUpIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveEntry(index, 1)}
                      disabled={disabled || index === entries.length - 1}
                      aria-label={`Mover ${title} para baixo`}
                      className="size-9"
                    >
                      <ArrowDownIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(entry.songId)}
                      disabled={disabled}
                      aria-label={`Remover ${title}`}
                      className="size-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr]">
                  <div className="space-y-1">
                    <Label htmlFor={`${inputId}-tone`} className="text-xs">
                      Tom
                    </Label>
                    <Input
                      id={`${inputId}-tone`}
                      value={entry.musicalKey ?? ""}
                      placeholder={song?.tone ?? "Ex.: G"}
                      maxLength={12}
                      disabled={disabled}
                      onChange={(event) =>
                        updateEntry(entry.songId, {
                          musicalKey: event.target.value,
                        })
                      }
                      className="h-11 sm:h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`${inputId}-notes`} className="text-xs">
                      Observação{" "}
                      <span className="font-normal text-muted-foreground">
                        (opcional)
                      </span>
                    </Label>
                    <Input
                      id={`${inputId}-notes`}
                      value={entry.notes ?? ""}
                      placeholder="Ex.: entrar direto no refrão"
                      maxLength={500}
                      disabled={disabled}
                      onChange={(event) =>
                        updateEntry(entry.songId, { notes: event.target.value })
                      }
                      className="h-11 sm:h-9"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {entries.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
          className="min-h-11 w-full"
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar ou remover músicas
        </Button>
      ) : null}

      <RehearsalSongPicker
        songs={songs}
        selectedIds={entries.map((entry) => entry.songId)}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handleConfirmSongs}
      />
    </div>
  );
}

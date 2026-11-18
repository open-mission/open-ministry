"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellRingIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  MapPinIcon,
  Music2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { updateRehearsalAction } from "@/app/actions/rehearsals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RehearsalAlertsDialog } from "@/features/rehearsals/components/rehearsal-alerts-dialog";
import type { RehearsalAlertRuleRow } from "@/features/rehearsals/components/rehearsal-alerts-dialog";
import { RehearsalFormDialog } from "@/features/rehearsals/components/rehearsal-form-dialog";
import {
  RehearsalDeleteDialog,
  type RehearsalListItem,
} from "@/features/rehearsals/components/rehearsal-list";
import {
  SongChordsSheet,
  type SongChordsSheetSong,
} from "@/features/rehearsals/components/song-chords-sheet";
import {
  buildRehearsalPayload,
  formatAlertRuleSummary,
  formatRehearsalFullDate,
  formatRehearsalTimeRange,
  rehearsalSongCountLabel,
  toRehearsalFormValues,
  type RehearsalSongOption,
} from "@/features/rehearsals/lib/rehearsal-ui";

export type RehearsalPanelRehearsal = Omit<RehearsalListItem, "songs"> & {
  songs?: {
    songId: string;
    musicalKey?: string | null;
    notes?: string | null;
    song?: {
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
    } | null;
  }[];
};

type RehearsalPanelProps = {
  departmentId: string;
  departmentName: string;
  rehearsal: RehearsalPanelRehearsal;
  songs: RehearsalSongOption[];
  alertRules: RehearsalAlertRuleRow[];
  canUpdate: boolean;
  canDelete: boolean;
  canManageAlerts: boolean;
};

export function RehearsalPanel({
  departmentId,
  departmentName,
  rehearsal,
  songs,
  alertRules,
  canUpdate,
  canDelete,
  canManageAlerts,
}: RehearsalPanelProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongChordsSheetSong | null>(
    null,
  );
  const [chordsOpen, setChordsOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [removingSongId, setRemovingSongId] = useState<string | null>(null);
  const [removedSongIds, setRemovedSongIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const handleRemoveSong = async (entry: { songId: string }) => {
    if (!canUpdate || removingSongId) return;

    setRemovingSongId(entry.songId);

    try {
      const values = toRehearsalFormValues(rehearsal);
      values.songs = values.songs.filter(
        (song) =>
          song.songId !== entry.songId &&
          !removedSongIds.includes(song.songId),
      );
      const payload = buildRehearsalPayload(values);
      const result = await updateRehearsalAction(
        departmentId,
        rehearsal.id,
        payload,
      );

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (selectedSongId === entry.songId) {
        setSelectedSong(null);
        setSelectedSongId(null);
        setChordsOpen(false);
      }

      setRemovedSongIds((current) => [...current, entry.songId]);
      toast.success("Música removida do repertório.");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a música. Tente novamente.",
      );
    } finally {
      setRemovingSongId(null);
    }
  };

  const entries = (rehearsal.songs ?? []).filter(
    (entry) => !removedSongIds.includes(entry.songId),
  );
  const songsById = new Map(songs.map((song) => [song.id, song]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-3.5" aria-hidden />
            {formatRehearsalFullDate(rehearsal.startsAt)} ·{" "}
            {formatRehearsalTimeRange(rehearsal.startsAt, rehearsal.endsAt)}
          </span>
          {rehearsal.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" aria-hidden />
              {rehearsal.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Music2Icon className="size-3.5" aria-hidden />
            {rehearsalSongCountLabel(entries.length)}
          </span>
        </p>

        {canUpdate || canDelete ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(true)}
                className="min-h-11 sm:min-h-9"
              >
                <PencilIcon data-icon="inline-start" />
                Editar ensaio
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="min-h-11 text-destructive hover:text-destructive sm:min-h-9"
              >
                <Trash2Icon data-icon="inline-start" />
                Excluir
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-w-0 border-border/80 shadow-xs">
          <CardHeader className="gap-1 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Music2Icon className="size-4" />
              </span>
              <CardTitle className="font-heading text-lg tracking-tight">
                Repertório
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Ordem das músicas e tons definidos para este ensaio.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Music2Icon className="size-4" />
                </span>
                <p className="text-sm font-medium">
                  Nenhuma música no repertório
                </p>
                <p className="text-xs text-muted-foreground">
                  {canUpdate
                    ? "Use “Editar ensaio” para adicionar as músicas."
                    : "A liderança ainda não definiu as músicas deste ensaio."}
                </p>
              </div>
            ) : (
              <ol className="space-y-2">
                {entries.map((entry, index) => {
                  const song = entry.song ?? songsById.get(entry.songId);
                  const tone = entry.musicalKey ?? song?.tone ?? null;
                  const title = song?.title ?? "Música removida";

                  return (
                    <li key={entry.songId}>
                      <div className="flex items-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSong({
                              title,
                              artist: song?.artist ?? null,
                              tone: song?.tone ?? null,
                              capo: entry.song?.capo ?? 0,
                              chords: entry.song?.chords ?? null,
                              lyrics: entry.song?.lyrics ?? null,
                              collection: entry.song?.collection ?? null,
                              tags: entry.song?.tags ?? null,
                              bpm: entry.song?.bpm ?? null,
                            });
                            setSelectedSongId(entry.songId);
                            setChordsOpen(true);
                          }}
                          aria-label={`Abrir cifra de ${title}`}
                          className="group flex min-h-11 min-w-0 flex-1 items-start gap-2.5 rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                        >
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-semibold">
                                {title}
                              </span>
                              {tone ? (
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 text-[11px] font-bold text-primary"
                                >
                                  Tom {tone}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {song?.artist || "Artista não informado"}
                            </p>
                            {entry.notes ? (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {entry.notes}
                              </p>
                            ) : null}
                          </div>
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                            <Music2Icon className="size-4" aria-hidden />
                          </span>
                        </button>

                        {canUpdate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSong(entry)}
                            disabled={removingSongId !== null}
                            aria-label={`Remover ${title} do repertório`}
                            title="Remover do repertório"
                            className="mt-0.5 size-9 min-h-11 shrink-0 text-muted-foreground hover:text-destructive sm:min-h-9"
                          >
                            {removingSongId === entry.songId ? (
                              <Loader2Icon
                                className="size-4 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Trash2Icon className="size-4" aria-hidden />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/80 shadow-xs">
          <CardHeader className="gap-1 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BellRingIcon className="size-4" />
                </span>
                <CardTitle className="font-heading text-lg tracking-tight">
                  Lembretes
                </CardTitle>
              </div>
              {canManageAlerts ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlertsOpen(true)}
                  className="min-h-11 sm:min-h-8"
                >
                  Configurar
                </Button>
              ) : null}
            </div>
            <CardDescription className="text-xs">
              Regras automáticas aplicadas aos ensaios de {departmentName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {alertRules.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                Nenhum lembrete configurado.
              </p>
            ) : (
              <ul className="space-y-2">
                {alertRules.map((rule, index) => (
                  <li
                    key={rule.id ?? `${rule.label}-${index}`}
                    className="flex items-start gap-2 rounded-lg border border-border/70 p-2.5"
                  >
                    <CheckCircle2Icon
                      aria-hidden
                      className={
                        rule.enabled === false
                          ? "mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                          : "mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      }
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-medium">{rule.label}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {formatAlertRuleSummary(rule)}
                        {rule.enabled === false ? " · Inativo" : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <SongChordsSheet
        song={selectedSong}
        open={chordsOpen}
        onOpenChange={setChordsOpen}
      />

      <RehearsalFormDialog
        departmentId={departmentId}
        songs={songs}
        rehearsal={rehearsal}
        open={formOpen}
        onOpenChange={setFormOpen}
        canEditSongs={canUpdate}
      />

      <RehearsalAlertsDialog
        departmentId={departmentId}
        departmentName={departmentName}
        rules={alertRules}
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        canManage={canManageAlerts}
      />

      <RehearsalDeleteDialog
        departmentId={departmentId}
        rehearsal={deleteOpen ? rehearsal : null}
        onOpenChange={setDeleteOpen}
        canDelete={canDelete}
        onDeleted={() =>
          router.push(`/dashboard/departments/${departmentId}`)
        }
      />
    </div>
  );
}

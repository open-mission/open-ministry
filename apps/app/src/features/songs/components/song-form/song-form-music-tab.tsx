"use client";

import { FileMusicIcon, FileTextIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SongFormFields } from "./song-form.types";

type SongFormMusicTabProps = {
  chords: string;
  lyrics: string;
  mobileMusicTab: "chords" | "lyrics";
  onMobileMusicTabChange: (tab: "chords" | "lyrics") => void;
  onFieldChange: (field: keyof SongFormFields, value: string) => void;
  onSyncLyricsClick: () => void;
};

export function SongFormMusicTab({
  chords,
  lyrics,
  mobileMusicTab,
  onMobileMusicTabChange,
  onFieldChange,
  onSyncLyricsClick,
}: SongFormMusicTabProps) {
  return (
    <>
      {/* CONTROLE DE SUB-ABAS NO MOBILE (CIFRA / LETRA) */}
      <div className="mb-2.5 flex shrink-0 items-center justify-between lg:hidden">
        <div
          role="tablist"
          aria-label="Cifra ou letra"
          className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs"
        >
          <button
            type="button"
            role="tab"
            id="mobile-music-chords-tab"
            aria-selected={mobileMusicTab === "chords"}
            aria-controls="mobile-music-chords-panel"
            onClick={() => onMobileMusicTabChange("chords")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mobileMusicTab === "chords"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileMusicIcon className="size-3.5" />
            <span>Cifra</span>
          </button>
          <button
            type="button"
            role="tab"
            id="mobile-music-lyrics-tab"
            aria-selected={mobileMusicTab === "lyrics"}
            aria-controls="mobile-music-lyrics-panel"
            onClick={() => onMobileMusicTabChange("lyrics")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mobileMusicTab === "lyrics"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileTextIcon className="size-3.5" />
            <span>Letra</span>
          </button>
        </div>

        {mobileMusicTab === "lyrics" ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onSyncLyricsClick}
            className="h-7 gap-1 px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
            title="Extrai e preenche a letra a partir da cifra"
          >
            <SparklesIcon className="size-3" />
            <span>Sincronizar</span>
          </Button>
        ) : null}
      </div>

      {/* GRID 2 COLUNAS NO DESKTOP / VISUALIZAÇÃO ALTERNADA NO MOBILE */}
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
        {/* COLUNA 1: CIFRA */}
        <div
          id="mobile-music-chords-panel"
          role="tabpanel"
          aria-labelledby="mobile-music-chords-tab"
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col space-y-1.5",
            mobileMusicTab === "lyrics" ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex shrink-0 items-center justify-between">
            <Label
              htmlFor="song-chords"
              className="flex items-center gap-1.5 text-xs font-medium text-foreground sm:text-sm"
            >
              <FileMusicIcon className="size-4 text-primary" />
              <span>Cifra (Acordes com texto)</span>
            </Label>
            <span className="text-[11px] font-mono text-muted-foreground">
              Fonte monoespaçada
            </span>
          </div>
          <Textarea
            id="song-chords"
            value={chords}
            onChange={(e) => onFieldChange("chords", e.target.value)}
            placeholder="Cole aqui a cifra do Cifra Club ou do seu arquivo .txt...&#10;&#10;[Intro] D  A6  D  A6&#10;&#10;[Primeira Parte]&#10;D         A6&#10;Os meus olhos viram a salvação&#10;D         A6&#10;A luz para o mundo, esperança da terra&#10;&#10;[Refrão]&#10;G           D&#10;Glória nas alturas"
            style={{ fieldSizing: "fixed" as never }}
            className="h-full min-h-0 flex-1 resize-none overflow-y-auto font-mono text-xs leading-relaxed sm:text-sm [field-sizing:fixed]"
          />
          <p className="shrink-0 text-[11px] leading-relaxed text-muted-foreground">
            Dica: Use <code>[Intro]</code>, <code>[Primeira Parte]</code>,{" "}
            <code>[Refrão]</code> ou <code>[Ponte]</code> para dividir a cifra
            em cards automáticos.
          </p>
        </div>

        {/* COLUNA 2: LETRA COMPLETA + BOTÃO DE SINCRONIZAÇÃO */}
        <div
          id="mobile-music-lyrics-panel"
          role="tabpanel"
          aria-labelledby="mobile-music-lyrics-tab"
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col space-y-1.5",
            mobileMusicTab === "chords" ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex shrink-0 items-center justify-between">
            <Label
              htmlFor="song-lyrics"
              className="flex items-center gap-1.5 text-xs font-medium text-foreground sm:text-sm"
            >
              <FileTextIcon className="size-4 text-primary" />
              <span>Letra completa da música</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onSyncLyricsClick}
              className="hidden h-7 gap-1.5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary lg:inline-flex"
              title="Extrai e preenche a letra a partir da cifra apagando acordes e tablaturas"
            >
              <SparklesIcon className="size-3 text-primary" />
              <span>Sincronizar da cifra</span>
            </Button>
          </div>
          <Textarea
            id="song-lyrics"
            value={lyrics}
            onChange={(e) => onFieldChange("lyrics", e.target.value)}
            placeholder="A letra cantada limpa sem acordes (para projeção de slides no culto e ensaios)...&#10;&#10;[Primeira Parte]&#10;Os meus olhos viram a salvação&#10;A luz para o mundo, esperança da terra&#10;&#10;[Refrão]&#10;Glória nas alturas"
            style={{ fieldSizing: "fixed" as never }}
            className="h-full min-h-0 flex-1 resize-none overflow-y-auto font-sans text-xs leading-relaxed sm:text-sm [field-sizing:fixed]"
          />
          <p className="shrink-0 text-[11px] leading-relaxed text-muted-foreground">
            Texto limpo sem acordes, ideal para projeção no telão e leitura dos
            vocalistas.
          </p>
        </div>
      </div>
    </>
  );
}

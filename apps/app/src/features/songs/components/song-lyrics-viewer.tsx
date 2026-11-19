"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SongSectionNoteMap } from "@/features/songs/lib/song-arrangements";
import { parseSongSections } from "@/lib/music/chords-utils";
import {
  LYRICS_FONT_SIZE_KEY,
  persistPreference,
  readStoredPreference,
  shiftFontSize,
  VIEWER_FONT_SIZE_LABELS,
  VIEWER_FONT_SIZES,
  type ViewerFontSize,
} from "@/lib/music/viewer-preferences";
import { cn } from "@/lib/utils";
import { SectionBadge } from "./section-badge";
import { SectionNoteStrip } from "./section-note-strip";

type SongLyricsViewerProps = {
  lyrics: string;
  /** Notas por seção, chaveadas por `SongSection.key` (ex.: `refrao#1`). */
  sectionNotes?: SongSectionNoteMap;
};

const LYRICS_FONT_CLASS: Record<ViewerFontSize, string> = {
  sm: "text-sm leading-relaxed",
  base: "text-sm leading-relaxed sm:text-[15px]",
  lg: "text-base leading-loose",
  xl: "text-lg leading-loose sm:text-xl",
};

/** O "A" central cresce junto com a preferência, mostrando o tamanho ativo. */
const LYRICS_FONT_PREVIEW_CLASS: Record<ViewerFontSize, string> = {
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function SongLyricsViewer({
  lyrics,
  sectionNotes,
}: SongLyricsViewerProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<ViewerFontSize>("base");

  const sections = useMemo(() => {
    return parseSongSections(lyrics);
  }, [lyrics]);

  // Preferência do vocalista persiste entre músicas e sessões.
  useEffect(() => {
    const stored = readStoredPreference(
      LYRICS_FONT_SIZE_KEY,
      VIEWER_FONT_SIZES,
    );
    if (!stored) return;

    // Aplica após o primeiro paint para não bloquear a renderização inicial.
    const frame = window.requestAnimationFrame(() => setFontSize(stored));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    persistPreference(LYRICS_FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const moveFontSize = (direction: 1 | -1) => {
    setFontSize((current) => shiftFontSize(current, direction));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopied(true);
      toast.success("Letra copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a letra.");
    }
  };

  if (!lyrics || !lyrics.trim()) {
    return (
      <Card className="p-6 text-center">
        <FileTextIcon className="mx-auto size-7 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">Nenhuma letra cadastrada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clique em Editar para adicionar a letra desta música.
        </p>
      </Card>
    );
  }

  const fontIndex = VIEWER_FONT_SIZES.indexOf(fontSize);

  return (
    <div className="space-y-3">
      {/* TOOLBAR DA LETRA COMPACTA */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs shadow-2xs">
        <div className="flex min-w-0 items-center gap-2">
          <FileTextIcon className="size-3.5 shrink-0 text-primary" />
          <span className="font-medium text-foreground">
            Letra Estruturada
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {sections.length} {sections.length === 1 ? "seção" : "seções"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5"
            role="group"
            aria-label="Tamanho da letra"
          >
            <button
              type="button"
              onClick={() => moveFontSize(-1)}
              disabled={fontIndex === 0}
              aria-label="Diminuir tamanho da letra"
              title="Diminuir letra"
              className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 sm:size-8"
            >
              <span className="text-[11px] font-semibold tracking-tight">
                A−
              </span>
            </button>
            <span
              aria-hidden="true"
              className={cn(
                "flex min-w-7 items-baseline justify-center font-heading font-semibold text-foreground",
                LYRICS_FONT_PREVIEW_CLASS[fontSize],
              )}
            >
              A
            </span>
            <button
              type="button"
              onClick={() => moveFontSize(1)}
              disabled={fontIndex === VIEWER_FONT_SIZES.length - 1}
              aria-label="Aumentar tamanho da letra"
              title="Aumentar letra"
              className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 sm:size-8"
            >
              <span className="text-[11px] font-semibold tracking-tight">
                A+
              </span>
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            Tamanho da letra: {VIEWER_FONT_SIZE_LABELS[fontSize]}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-11 gap-1.5 px-3 text-xs font-medium shadow-2xs sm:h-8"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-600" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copiado!" : "Copiar letra"}
            </span>
          </Button>
        </div>
      </div>

      {/* SEÇÕES EM CARDS MINIMALISTAS (MENOS PADDING E MARGEM) */}
      <div className="space-y-2.5">
        {sections.map((section) => (
          <Card
            key={section.id}
            className="overflow-hidden border border-border/70 bg-card shadow-2xs transition-colors hover:border-border"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/15 px-3.5 py-1.5 sm:px-4 sm:py-2">
              <SectionBadge type={section.type} name={section.name} />
            </CardHeader>
            {sectionNotes?.[section.key] ? (
              <div className="border-b border-border/50 bg-primary/[0.03] px-3.5 py-1.5 sm:px-4">
                <SectionNoteStrip
                  note={sectionNotes[section.key]}
                  sectionKey={section.key}
                  sectionName={section.name}
                />
              </div>
            ) : null}
            <CardContent className="px-3.5 py-2.5 sm:px-4 sm:py-3.5">
              <div
                className={cn(
                  "whitespace-pre-line font-sans text-foreground",
                  LYRICS_FONT_CLASS[fontSize],
                )}
              >
                {section.content}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

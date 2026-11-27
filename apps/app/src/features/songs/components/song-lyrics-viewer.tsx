"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  Maximize2Icon,
  PauseIcon,
  PlayIcon,
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
import { SectionJumpPills } from "./viewer/section-jump-pills";
import { StageShell } from "./viewer/stage-shell";
import {
  AUTO_SCROLL_SPEEDS,
  useAutoScroll,
  type AutoScrollSpeed,
} from "./viewer/use-auto-scroll";

type SongLyricsViewerProps = {
  lyrics: string;
  /** Notas por seção, chaveadas por `SongSection.key` (ex.: `refrao#1`). */
  sectionNotes?: SongSectionNoteMap;
  songTitle?: string;
  songArtist?: string;
  hideFullscreenButton?: boolean;
};

const LYRICS_FONT_CLASS: Record<ViewerFontSize, string> = {
  sm: "text-sm leading-relaxed",
  base: "text-sm leading-relaxed sm:text-[15px]",
  lg: "text-base leading-loose",
  xl: "text-lg leading-loose sm:text-xl",
};

const STAGE_LYRICS_FONT_CLASS: Record<ViewerFontSize, string> = {
  sm: "text-base leading-relaxed",
  base: "text-lg leading-relaxed",
  lg: "text-xl leading-loose",
  xl: "text-2xl leading-loose",
};

const LYRICS_FONT_PREVIEW_CLASS: Record<ViewerFontSize, string> = {
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function SongLyricsViewer({
  lyrics,
  sectionNotes,
  songTitle,
  songArtist,
  hideFullscreenButton = false,
}: SongLyricsViewerProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<ViewerFontSize>("base");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<AutoScrollSpeed>(1);

  const stageScrollRef = useRef<HTMLDivElement>(null);
  const inlineRootRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => parseSongSections(lyrics), [lyrics]);

  useEffect(() => {
    const stored = readStoredPreference(
      LYRICS_FONT_SIZE_KEY,
      VIEWER_FONT_SIZES,
    );
    if (!stored) return;

    const frame = window.requestAnimationFrame(() => setFontSize(stored));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    persistPreference(LYRICS_FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  useAutoScroll({
    active: autoScrollActive,
    speed: autoScrollSpeed,
    containerRef: isFullscreen ? stageScrollRef : undefined,
  });

  const moveFontSize = (direction: 1 | -1) => {
    setFontSize((current) => shiftFontSize(current, direction));
  };

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setAutoScrollActive(false);
  }, []);

  const cycleAutoScrollSpeed = useCallback(() => {
    setAutoScrollSpeed((current) => {
      const idx = AUTO_SCROLL_SPEEDS.indexOf(current);
      return AUTO_SCROLL_SPEEDS[(idx + 1) % AUTO_SCROLL_SPEEDS.length] ?? 1;
    });
  }, []);

  const handleJumpSection = useCallback(
    (sectionKey: string) => {
      const scope = isFullscreen
        ? stageScrollRef.current
        : inlineRootRef.current;
      const escaped = sectionKey.replace(/"/g, '\\"');
      const target = scope?.querySelector<HTMLElement>(
        `[data-section-key="${escaped}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [isFullscreen],
  );

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

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <FileTextIcon className="size-3.5 shrink-0 text-primary" />
        <span className="font-medium text-foreground">Letra</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {sections.length} {sections.length === 1 ? "seção" : "seções"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="text-[11px] font-semibold tracking-tight">A−</span>
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
            <span className="text-[11px] font-semibold tracking-tight">A+</span>
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          Tamanho da letra: {VIEWER_FONT_SIZE_LABELS[fontSize]}
        </span>

        <Button
          type="button"
          variant={autoScrollActive ? "secondary" : "outline"}
          size="sm"
          onClick={() => setAutoScrollActive((active) => !active)}
          aria-pressed={autoScrollActive}
          aria-label={
            autoScrollActive
              ? "Pausar rolagem automática"
              : "Iniciar rolagem automática"
          }
          className="min-h-11 gap-1.5 px-2.5 text-xs font-medium shadow-2xs sm:min-h-9"
        >
          {autoScrollActive ? (
            <PauseIcon className="size-3.5 text-primary" />
          ) : (
            <PlayIcon className="size-3.5" />
          )}
          <span className="hidden sm:inline">Auto-scroll</span>
        </Button>

        {autoScrollActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cycleAutoScrollSpeed}
            aria-label={`Velocidade da rolagem: ${autoScrollSpeed}x`}
            className="min-h-11 px-2 font-mono text-[11px] font-semibold text-primary sm:min-h-9"
          >
            {autoScrollSpeed}×
          </Button>
        ) : null}

        {!isFullscreen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="min-h-11 gap-1.5 px-2.5 text-xs font-medium shadow-2xs sm:min-h-9"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-600" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copiado!" : "Copiar"}
            </span>
          </Button>
        ) : null}

        {!isFullscreen && !hideFullscreenButton ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsFullscreen(true)}
            aria-label="Abrir letra no modo palco"
            className="min-h-11 gap-1.5 px-3 text-xs font-semibold shadow-2xs sm:min-h-9"
          >
            <Maximize2Icon className="size-3.5" />
            <span>Modo Palco</span>
          </Button>
        ) : null}
      </div>
    </div>
  );

  const renderSections = (stageMode: boolean) => (
    <div className="space-y-3">
      <SectionJumpPills sections={sections} onJump={handleJumpSection} />
      <div className="space-y-2.5">
        {sections.map((section) => (
          <Card
            key={section.id}
            data-section-key={section.key}
            className="scroll-mt-4 overflow-hidden border border-border/70 bg-card shadow-2xs transition-colors hover:border-border"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/15 px-3.5 py-1.5 sm:px-4 sm:py-2">
              <SectionBadge type={section.type} name={section.name} />
            </CardHeader>
            {sectionNotes?.[section.key] ? (
              <div className="border-b border-border/50 bg-primary/3 px-3.5 py-1.5 sm:px-4">
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
                  stageMode
                    ? STAGE_LYRICS_FONT_CLASS[fontSize]
                    : LYRICS_FONT_CLASS[fontSize],
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

  return (
    <div ref={inlineRootRef} className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-card px-3 py-2 shadow-2xs">
        {toolbar}
      </div>

      {renderSections(false)}

      <StageShell
        open={isFullscreen}
        onClose={closeFullscreen}
        title={songTitle ? `${songTitle} · Letra` : "Letra no Modo Palco"}
        artist={songArtist}
        toolbar={toolbar}
        contentRef={stageScrollRef}
      >
        <div className="mx-auto max-w-3xl pb-16">{renderSections(true)}</div>
      </StageShell>
    </div>
  );
}

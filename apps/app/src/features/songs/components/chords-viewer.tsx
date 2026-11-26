"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileMusicIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getChordsViewerControlVisibility,
  isSectionNoteEditEnabled,
} from "@/features/songs/lib/chords-viewer-controls";
import type { SongSectionNoteMap } from "@/features/songs/lib/song-arrangements";
import {
  getSemitoneDistance,
  getShapeTone,
  getStageShortcutAction,
  getTargetTones,
  isChordLine,
  parseSongSections,
  tokenizeChordLine,
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";
import {
  CHORDS_FONT_SIZE_KEY,
  CHORDS_VIEW_MODE_KEY,
  persistPreference,
  readStoredPreference,
  shiftFontSize,
  VIEWER_FONT_SIZES,
  type ViewerFontSize,
} from "@/lib/music/viewer-preferences";
import { cn } from "@/lib/utils";
import { ChordsHelpDialog } from "./chords-viewer/chords-help-dialog";
import {
  ChordsToolbar,
  type ChordsViewMode,
} from "./chords-viewer/chords-toolbar";
import { SectionBadge } from "./section-badge";
import { SectionNoteStrip } from "./section-note-strip";
import { SectionJumpPills } from "./viewer/section-jump-pills";
import { StageShell } from "./viewer/stage-shell";
import {
  AUTO_SCROLL_SPEEDS,
  useAutoScroll,
  type AutoScrollSpeed,
} from "./viewer/use-auto-scroll";

type ChordsViewerProps = {
  chords: string;
  originalTone?: string | null;
  capo?: number | null;
  songTitle?: string;
  songArtist?: string;
  /**
   * Esconde o botão "Modo Palco". Use quando o visualizador já está dentro de
   * um Sheet/Drawer, para o modo palco em portal não conflitar com o foco.
   */
  hideFullscreenButton?: boolean;
  /** Notas por seção, chaveadas por `SongSection.key` (ex.: `refrao#1`). */
  sectionNotes?: SongSectionNoteMap;
  /** Só habilita o botão "Editar nota" para quem pode editar a música. */
  canEditNotes?: boolean;
  onEditNote?: (sectionKey: string) => void;
};

const VIEW_MODES: ChordsViewMode[] = ["sections", "columns", "continuous"];

const FONT_CLASS: Record<ViewerFontSize, string> = {
  sm: "text-xs leading-relaxed",
  base: "text-sm leading-relaxed",
  lg: "text-base leading-loose",
  xl: "text-lg leading-loose font-medium sm:text-xl",
};

function renderChordLine(line: string, lineKey: string | number) {
  if (isChordLine(line)) {
    const tokens = tokenizeChordLine(line);
    return (
      <div key={lineKey} className="font-mono">
        {tokens.map((token, tokenIndex) =>
          token.type === "chord" ? (
            <span
              key={tokenIndex}
              className="font-bold text-amber-800 select-text dark:text-amber-300"
            >
              {token.value}
            </span>
          ) : (
            <span key={tokenIndex}>{token.value}</span>
          ),
        )}
      </div>
    );
  }

  if (/^[eBGDAE]?\|[-0-9pbrh\/~\s|]+$/i.test(line.trim())) {
    return (
      <div key={lineKey} className="font-mono text-muted-foreground">
        {line}
      </div>
    );
  }

  return (
    <div key={lineKey} className="font-mono text-foreground">
      {line || "\u00A0"}
    </div>
  );
}

export function ChordsViewer({
  chords,
  originalTone,
  capo = 0,
  songTitle,
  songArtist,
  hideFullscreenButton = false,
  sectionNotes,
  canEditNotes = false,
  onEditNote,
}: ChordsViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<ViewerFontSize>("base");
  const [viewMode, setViewMode] = useState<ChordsViewMode>("sections");
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<AutoScrollSpeed>(1);

  const stageScrollRef = useRef<HTMLDivElement>(null);
  const inlineRootRef = useRef<HTMLDivElement>(null);
  const helpOpenRef = useRef(false);

  const safeCapo = Math.min(12, Math.max(0, Number(capo) || 0));

  useEffect(() => {
    helpOpenRef.current = helpOpen;
  }, [helpOpen]);

  useEffect(() => {
    const storedFont = readStoredPreference(
      CHORDS_FONT_SIZE_KEY,
      VIEWER_FONT_SIZES,
    );
    const storedView = readStoredPreference(CHORDS_VIEW_MODE_KEY, VIEW_MODES);
    if (!storedFont && !storedView) return;

    const frame = window.requestAnimationFrame(() => {
      if (storedFont) setFontSize(storedFont);
      if (storedView) setViewMode(storedView);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    persistPreference(CHORDS_FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    persistPreference(CHORDS_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useAutoScroll({
    active: autoScrollActive,
    speed: autoScrollSpeed,
    containerRef: isFullscreen ? stageScrollRef : undefined,
  });

  const currentTone = useMemo(() => {
    if (!originalTone) return null;
    return transposeChord(originalTone, semitones);
  }, [originalTone, semitones]);

  const shapeTone = useMemo(
    () => getShapeTone(currentTone ?? originalTone, safeCapo),
    [currentTone, originalTone, safeCapo],
  );

  const transposedText = useMemo(
    () => transposeChordsText(chords, semitones),
    [chords, semitones],
  );

  const sections = useMemo(
    () => parseSongSections(transposedText),
    [transposedText],
  );

  const sectionKeys = useMemo(
    () => new Set(sections.map((section) => section.key)),
    [sections],
  );

  const orphanNotes = useMemo(
    () =>
      Object.entries(sectionNotes ?? {}).filter(
        ([key, note]) => note.trim().length > 0 && !sectionKeys.has(key),
      ),
    [sectionNotes, sectionKeys],
  );

  const toneOptions = useMemo(
    () => getTargetTones(originalTone),
    [originalTone],
  );

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setAutoScrollActive(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((previous) => {
      if (previous) setAutoScrollActive(false);
      return !previous;
    });
  }, []);

  const moveFontSize = useCallback((direction: 1 | -1) => {
    setFontSize((current) => shiftFontSize(current, direction));
  }, []);

  const cycleViewMode = useCallback(() => {
    setViewMode((current) => {
      const index = VIEW_MODES.indexOf(current);
      return VIEW_MODES[(index + 1) % VIEW_MODES.length] ?? current;
    });
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

  useEffect(() => {
    const handleHelpKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      const isTyping =
        target instanceof Element &&
        Boolean(target.closest("input, textarea, select, [contenteditable]"));

      if (isTyping) return;

      event.preventDefault();
      setHelpOpen((open) => !open);
    };

    window.addEventListener("keydown", handleHelpKeyDown);
    return () => window.removeEventListener("keydown", handleHelpKeyDown);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transposedText);
      setCopied(true);
      toast.success("Cifra copiada para a área de transferência!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, [transposedText]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (helpOpenRef.current) return;

      const target = event.target;
      const isInteractiveTarget =
        target instanceof Element &&
        Boolean(
          target.closest(
            "a[href], button, input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='button'], [role='link'], [role='textbox']",
          ),
        );
      const action = getStageShortcutAction(
        event.key,
        isFullscreen,
        isInteractiveTarget,
        true,
      );
      if (!action) return;

      event.preventDefault();
      switch (action) {
        case "transposeUp":
          setSemitones((value) => value + 1);
          break;
        case "transposeDown":
          setSemitones((value) => value - 1);
          break;
        case "resetTone":
          setSemitones(0);
          break;
        case "fontSizeUp":
          moveFontSize(1);
          break;
        case "fontSizeDown":
          moveFontSize(-1);
          break;
        case "toggleFullscreen":
          toggleFullscreen();
          break;
        case "cycleViewMode":
          cycleViewMode();
          break;
        case "close":
          closeFullscreen();
          break;
        case "copy":
          void handleCopy();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeFullscreen,
    cycleViewMode,
    handleCopy,
    isFullscreen,
    moveFontSize,
    toggleFullscreen,
  ]);

  const handleTargetToneChange = (target: string) => {
    if (!originalTone) return;
    if (!target) {
      setSemitones(0);
      return;
    }
    setSemitones(getSemitoneDistance(originalTone, target));
  };

  if (!chords || !chords.trim()) {
    return (
      <Card className="p-6 text-center">
        <FileMusicIcon className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Nenhuma cifra cadastrada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clique em Editar para colar a cifra com acordes e tablaturas.
        </p>
      </Card>
    );
  }

  const fontSizeClass = FONT_CLASS[fontSize];
  const controlVisibility = getChordsViewerControlVisibility({
    isFullscreen,
    hideFullscreenButton,
  });
  const noteEditEnabled = isSectionNoteEditEnabled(canEditNotes, isFullscreen);

  const toolbar = (
    <ChordsToolbar
      originalTone={originalTone}
      currentTone={currentTone}
      safeCapo={safeCapo}
      shapeTone={shapeTone}
      semitones={semitones}
      toneOptions={toneOptions}
      onStepSemitones={(delta) => setSemitones((value) => value + delta)}
      onResetTone={() => setSemitones(0)}
      onTargetToneChange={handleTargetToneChange}
      fontSize={fontSize}
      onMoveFontSize={moveFontSize}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      autoScrollActive={autoScrollActive}
      autoScrollSpeed={autoScrollSpeed}
      onToggleAutoScroll={() => setAutoScrollActive((active) => !active)}
      onCycleAutoScrollSpeed={cycleAutoScrollSpeed}
      copied={copied}
      onCopy={handleCopy}
      onOpenHelp={() => setHelpOpen(true)}
      onToggleFullscreen={toggleFullscreen}
      controlVisibility={controlVisibility}
    />
  );

  const orphanNotesCard =
    orphanNotes.length > 0 ? (
      <Card className="overflow-hidden border border-dashed border-border/80 bg-card shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/15 px-3.5 py-1.5 sm:px-4 sm:py-2">
          <Badge variant="outline" className="text-[11px] font-medium">
            Sem seção
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 px-3.5 py-3 sm:px-4 sm:py-3.5">
          {orphanNotes.map(([key, note]) => (
            <SectionNoteStrip
              key={key}
              note={note}
              sectionKey={key}
              canEdit={noteEditEnabled}
              onEdit={onEditNote}
              orphan
            />
          ))}
        </CardContent>
      </Card>
    ) : null;

  const renderSectionBlocks = (twoColumns: boolean) => (
    <div
      className={cn(
        twoColumns ? "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4" : "space-y-3",
      )}
    >
      {sections.map((section) => (
        <section
          key={section.id}
          data-section-key={section.key}
          className="scroll-mt-4 overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xs"
        >
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/15 px-3.5 py-1.5 sm:px-4 sm:py-2">
            <SectionBadge type={section.type} name={section.name} />
          </div>
          {sectionNotes?.[section.key] ? (
            <div className="border-b border-border/50 bg-primary/3 px-3.5 py-1.5 sm:px-4">
              <SectionNoteStrip
                note={sectionNotes[section.key]}
                sectionKey={section.key}
                sectionName={section.name}
                canEdit={noteEditEnabled}
                onEdit={onEditNote}
              />
            </div>
          ) : null}
          <div className="overflow-x-auto px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div
              className={cn(
                "font-mono whitespace-pre select-text",
                fontSizeClass,
              )}
            >
              {section.content
                .split("\n")
                .map((line, lineIndex) => renderChordLine(line, lineIndex))}
            </div>
          </div>
        </section>
      ))}
      {orphanNotesCard}
    </div>
  );

  const continuousView = (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs sm:p-5">
      <div className={cn("font-mono whitespace-pre select-text", fontSizeClass)}>
        {transposedText
          .split("\n")
          .map((line, lineIndex) => renderChordLine(line, lineIndex))}
      </div>
    </div>
  );

  const renderedSheet = (
    <>
      {viewMode !== "continuous" ? (
        <SectionJumpPills
          sections={sections}
          onJump={handleJumpSection}
          className="mb-3"
        />
      ) : null}
      {viewMode === "sections"
        ? renderSectionBlocks(false)
        : viewMode === "columns"
          ? renderSectionBlocks(true)
          : continuousView}
      {viewMode === "continuous" ? orphanNotesCard : null}
    </>
  );

  return (
    <div ref={inlineRootRef} className="space-y-3">
      <div className="rounded-xl border border-border/80 bg-card p-2 shadow-2xs sm:p-2.5">
        {toolbar}
      </div>

      {renderedSheet}

      <StageShell
        open={isFullscreen}
        onClose={closeFullscreen}
        title={songTitle || "Cifra da Música"}
        artist={songArtist}
        toolbar={toolbar}
        contentRef={stageScrollRef}
        trapFocus={!helpOpen}
        onEscape={() => {
          if (helpOpenRef.current) setHelpOpen(false);
          else closeFullscreen();
        }}
      >
        <div className="mx-auto max-w-5xl pb-16">{renderedSheet}</div>
      </StageShell>

      <ChordsHelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        isFullscreen={isFullscreen}
      />
    </div>
  );
}

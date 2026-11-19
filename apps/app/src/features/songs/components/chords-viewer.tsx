"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  CheckIcon,
  Columns3Icon,
  CopyIcon,
  FileMusicIcon,
  KeyboardIcon,
  LayoutGridIcon,
  ListIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  Music2Icon,
  PlusIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { NativeSelect } from "@/components/ui/native-select";
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
  VIEWER_FONT_SIZE_LABELS,
  VIEWER_FONT_SIZES,
  type ViewerFontSize,
} from "@/lib/music/viewer-preferences";
import { cn } from "@/lib/utils";
import { SectionBadge } from "./section-badge";
import { SectionNoteStrip } from "./section-note-strip";

type ChordsViewerProps = {
  chords: string;
  originalTone?: string | null;
  capo?: number | null;
  songTitle?: string;
  songArtist?: string;
  /**
   * Esconde o botão "Tela cheia". Use quando o visualizador já está dentro de
   * um Sheet/Drawer, para o modo palco em portal não conflitar com o foco.
   */
  hideFullscreenButton?: boolean;
  /** Notas por seção, chaveadas por `SongSection.key` (ex.: `refrao#1`). */
  sectionNotes?: SongSectionNoteMap;
  /** Só habilita o botão "Editar nota" para quem pode editar a música. */
  canEditNotes?: boolean;
  onEditNote?: (sectionKey: string) => void;
};

type FontSize = ViewerFontSize;
type ViewMode = "sections" | "columns" | "continuous";

const FONT_SIZE_KEY = CHORDS_FONT_SIZE_KEY;
const VIEW_MODE_KEY = CHORDS_VIEW_MODE_KEY;
const FONT_SIZES: FontSize[] = [...VIEWER_FONT_SIZES];
const VIEW_MODES: ViewMode[] = ["sections", "columns", "continuous"];

const FONT_CLASS: Record<FontSize, string> = {
  sm: "text-xs leading-relaxed",
  base: "text-sm leading-relaxed",
  lg: "text-base leading-loose",
  xl: "text-lg leading-loose font-medium sm:text-xl",
};

const STAGE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["+"], label: "Sobe meio tom" },
  { keys: ["−"], label: "Desce meio tom" },
  { keys: ["0"], label: "Volta ao tom original" },
  { keys: ["F"], label: "Entra ou sai da tela cheia" },
  { keys: ["T"], label: "Alterna seções, colunas e contínua" },
  { keys: ["C"], label: "Copia a cifra" },
  { keys: ["↑", "↓"], label: "Aumenta ou diminui a fonte" },
  { keys: ["Esc"], label: "Sai do modo palco" },
  { keys: ["?"], label: "Abre esta ajuda" },
];

function ToolbarButton({
  label,
  active,
  onClick,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      title={label}
      className={cn(
        "flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-9",
        active && "bg-background font-semibold text-foreground shadow-2xs",
        className,
      )}
    >
      {children}
    </button>
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
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [viewMode, setViewMode] = useState<ViewMode>("sections");

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const helpOpenRef = useRef(false);

  const safeCapo = Math.min(12, Math.max(0, Number(capo) || 0));

  useEffect(() => {
    helpOpenRef.current = helpOpen;
  }, [helpOpen]);

  // Preferências do músico persistem entre músicas e sessões.
  useEffect(() => {
    const storedFont = readStoredPreference(FONT_SIZE_KEY, FONT_SIZES);
    const storedView = readStoredPreference(VIEW_MODE_KEY, VIEW_MODES);
    if (!storedFont && !storedView) return;

    // Aplica após o primeiro paint para não bloquear a renderização inicial.
    const frame = window.requestAnimationFrame(() => {
      if (storedFont) setFontSize(storedFont);
      if (storedView) setViewMode(storedView);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    persistPreference(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    persistPreference(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

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

  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  const toggleFullscreen = useCallback(
    () => setIsFullscreen((previous) => !previous),
    [],
  );

  const moveFontSize = useCallback((direction: 1 | -1) => {
    setFontSize((current) => shiftFontSize(current, direction));
  }, []);

  const cycleViewMode = useCallback(() => {
    setViewMode((current) => {
      const index = VIEW_MODES.indexOf(current);
      return VIEW_MODES[(index + 1) % VIEW_MODES.length] ?? current;
    });
  }, []);

  // Mantém a tela acesa durante o modo palco e readquire o lock ao voltar para a aba.
  useEffect(() => {
    if (!isFullscreen) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const requestWakeLock = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Permissão negada ou API indisponível — segue sem manter a tela acesa.
        sentinel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (disposed) return;
      if (document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [isFullscreen]);

  // Ajuda de palco: "?" fica disponível também fora da tela cheia.
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

  // Tela cheia acessível: trava o foco, bloqueia o scroll e restaura o foco.
  useEffect(() => {
    if (!isFullscreen) return;

    const container = fullscreenRef.current;
    const previous = document.activeElement as HTMLElement | null;
    previouslyFocusedRef.current = previous;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget =
      container?.querySelector<HTMLElement>("[data-autofocus]") ?? container;
    const animationFrame = window.requestAnimationFrame(() => {
      focusTarget?.focus();
    });

    const handleTab = (event: KeyboardEvent) => {
      // Com a ajuda aberta, o Dialog cuida da própria armadilha de foco.
      if (event.key !== "Tab" || !container || helpOpenRef.current) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (active === first || !container.contains(active))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !container.contains(active))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleTab);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isFullscreen]);

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

  // Atalhos ficam ativos apenas no modo palco e não interceptam controles.
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // A ajuda aberta captura o teclado para si (Esc e Tab ficam no Dialog).
      if (helpOpenRef.current) return;

      const target = event.target;
      const isInteractiveTarget =
        target instanceof Element &&
        Boolean(
          target.closest(
            "a[href], button, input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='button'], [role='link'], [role='textbox']",
          ),
        );
      const isWithinStage =
        target instanceof Node &&
        Boolean(fullscreenRef.current?.contains(target));
      const action = getStageShortcutAction(
        event.key,
        isFullscreen,
        isInteractiveTarget,
        isWithinStage,
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

  const fontSizeClass = FONT_CLASS[fontSize];

  const renderChordLine = (line: string, lineKey: string | number) => {
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

  const controlVisibility = getChordsViewerControlVisibility({
    isFullscreen,
    hideFullscreenButton,
  });

  const noteEditEnabled = isSectionNoteEditEnabled(canEditNotes, isFullscreen);

  // Copiar, atalhos e tela cheia só fazem sentido fora do modo palco. No palco
  // a barra fica enxuta para liberar espaço vertical.
  const secondaryControls = (
    <>
      {controlVisibility.copy ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-11 gap-1.5 px-3 text-xs font-medium shadow-2xs sm:h-9"
          aria-label={copied ? "Cifra copiada" : "Copiar cifra"}
          title="Copiar cifra (C)"
        >
          {copied ? (
            <CheckIcon className="size-4 text-emerald-700 dark:text-emerald-300" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          <span className="hidden sm:inline">
            {copied ? "Copiado!" : "Copiar"}
          </span>
        </Button>
      ) : null}

      {controlVisibility.help ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setHelpOpen(true)}
          className="h-11 w-11 shrink-0 px-0 text-muted-foreground shadow-2xs hover:text-foreground sm:h-9 sm:w-9"
          aria-label="Ver atalhos do modo palco"
          title="Atalhos do modo palco (?)"
        >
          <KeyboardIcon className="size-4" />
        </Button>
      ) : null}

      {controlVisibility.fullscreen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="h-11 gap-1.5 px-3 text-xs font-semibold text-primary shadow-2xs hover:bg-primary/10 sm:h-9"
          aria-label="Abrir modo palco em tela cheia"
          title="Modo palco (F)"
        >
          <Maximize2Icon className="size-4" />
          <span className="hidden sm:inline">Tela cheia</span>
        </Button>
      ) : null}
    </>
  );

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-h-11 flex-wrap items-center gap-x-1.5 rounded-lg border border-border/80 bg-background px-2.5 text-xs shadow-2xs sm:min-h-9">
          <span className="text-muted-foreground">Tom</span>
          <span className="font-sans text-sm font-semibold text-foreground">
            {currentTone ?? originalTone ?? "—"}
          </span>
          {safeCapo > 0 ? (
            <span className="text-muted-foreground">
              · Capo {safeCapo}
              {shapeTone ? ` · forma ${shapeTone}` : ""}
            </span>
          ) : null}
          {semitones !== 0 ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {semitones > 0 ? `+${semitones}` : semitones}
            </span>
          ) : null}
        </div>

        <label className="sr-only" htmlFor="chords-viewer-target-tone">
          Tom alvo
        </label>
        <NativeSelect
          id="chords-viewer-target-tone"
          value={currentTone ?? ""}
          onChange={(event) => handleTargetToneChange(event.target.value)}
          disabled={!originalTone}
          title="Selecionar tom alvo"
          className="[&_select]:h-11 [&_select]:text-xs sm:[&_select]:h-9"
          aria-label="Selecionar tom alvo"
        >
          <option value="">Tom alvo</option>
          {toneOptions.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </NativeSelect>

        <div className="inline-flex min-h-11 items-center rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs sm:min-h-9">
          <ToolbarButton
            label="Diminuir meio tom"
            onClick={() => setSemitones((value) => value - 1)}
          >
            <MinusIcon className="size-4" />
          </ToolbarButton>
          <button
            type="button"
            onClick={() => setSemitones(0)}
            disabled={semitones === 0}
            aria-label="Restaurar tom original"
            title="Restaurar tom original (0)"
            className={cn(
              "flex h-10 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8",
              semitones !== 0
                ? "font-semibold text-primary hover:bg-primary/10"
                : "cursor-default text-muted-foreground",
            )}
          >
            <RotateCcwIcon className="size-3.5" />
            <span className="hidden sm:inline">Original</span>
          </button>
          <ToolbarButton
            label="Aumentar meio tom"
            onClick={() => setSemitones((value) => value + 1)}
          >
            <PlusIcon className="size-4" />
          </ToolbarButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex min-h-11 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs sm:min-h-9"
          role="group"
          aria-label="Tamanho da fonte"
        >
          {FONT_SIZES.map((size, index) => (
            <ToolbarButton
              key={size}
              label={`Tamanho da fonte: ${VIEWER_FONT_SIZE_LABELS[size]}`}
              active={fontSize === size}
              onClick={() => setFontSize(size)}
            >
              <span className="text-xs font-semibold">
                {["A-", "A", "A+", "A++"][index]}
              </span>
            </ToolbarButton>
          ))}
        </div>

        <div
          className="inline-flex min-h-11 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs sm:min-h-9"
          role="group"
          aria-label="Modo de visualização"
        >
          <ToolbarButton
            label="Visualização em seções"
            active={viewMode === "sections"}
            onClick={() => setViewMode("sections")}
          >
            <LayoutGridIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Visualização em colunas"
            active={viewMode === "columns"}
            onClick={() => setViewMode("columns")}
          >
            <Columns3Icon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Visualização contínua"
            active={viewMode === "continuous"}
            onClick={() => setViewMode("continuous")}
          >
            <ListIcon className="size-4" />
          </ToolbarButton>
        </div>

        {secondaryControls}
      </div>
    </div>
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

  const sectionsView = (
    <div className="space-y-3">
      {sections.map((section) => (
        <Card
          key={section.id}
          className="overflow-hidden border border-border/70 bg-card shadow-2xs"
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
                canEdit={noteEditEnabled}
                onEdit={onEditNote}
              />
            </div>
          ) : null}
          <CardContent className="overflow-x-auto px-3.5 py-3 sm:px-4 sm:py-3.5">
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
          </CardContent>
        </Card>
      ))}
      {orphanNotesCard}
    </div>
  );

  const columnsView = (
    <div className="flex items-start gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin]">
      {sections.map((section) => (
        <div
          key={section.id}
          className="flex w-[86vw] max-w-[460px] shrink-0 snap-start flex-col rounded-xl border border-border/70 bg-card shadow-2xs sm:w-[420px] lg:w-[460px]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2.5">
            <SectionBadge type={section.type} name={section.name} />
          </div>
          {sectionNotes?.[section.key] ? (
            <div className="border-b border-border/50 bg-primary/[0.03] px-4 py-1.5">
              <SectionNoteStrip
                note={sectionNotes[section.key]}
                sectionKey={section.key}
                sectionName={section.name}
                canEdit={noteEditEnabled}
                onEdit={onEditNote}
              />
            </div>
          ) : null}
          <div className="max-h-[72vh] overflow-x-hidden overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5">
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
        </div>
      ))}
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

  return (
    <div className="space-y-3.5">
      <div className="rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs sm:p-3">
        {controls}
      </div>

      {viewMode === "sections"
        ? sectionsView
        : viewMode === "columns"
          ? columnsView
          : continuousView}

      {viewMode === "continuous" ? orphanNotesCard : null}

      {isFullscreen && isClient
        ? createPortal(
            <div
              ref={fullscreenRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="chords-viewer-fullscreen-title"
              tabIndex={-1}
              className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-contain bg-background text-foreground select-text focus:outline-none"
            >
              <div className="flex shrink-0 flex-col gap-2 border-b border-border/70 bg-card/95 px-3 py-2 shadow-xs backdrop-blur-xs sm:px-5 sm:py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                      <Music2Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="chords-viewer-fullscreen-title"
                        className="truncate font-heading text-sm font-bold text-foreground sm:text-base"
                      >
                        {songTitle || "Cifra da Música"}
                      </h2>
                      {songArtist ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {songArtist}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={closeFullscreen}
                    className="h-11 gap-1.5 px-3 text-xs font-semibold shadow-2xs sm:h-9 sm:px-3.5"
                    aria-label="Sair do modo palco (Esc)"
                  >
                    <Minimize2Icon className="size-4" />
                    <span>Sair</span>
                    <kbd className="hidden rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[11px] sm:inline">
                      ESC
                    </kbd>
                  </Button>
                </div>

                {controls}
              </div>

              <div
                tabIndex={0}
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 focus-visible:outline-none sm:p-6 lg:p-8 [-webkit-overflow-scrolling:touch]"
              >
                <div className="mx-auto max-w-5xl pb-16">
                  {viewMode === "sections"
                    ? sectionsView
                    : viewMode === "columns"
                      ? columnsView
                      : continuousView}
                  {viewMode === "continuous" ? orphanNotesCard : null}
                </div>
              </div>

              <button
                type="button"
                onClick={closeFullscreen}
                aria-label="Fechar modo palco"
                title="Fechar (Esc)"
                className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
              >
                <XIcon className="size-5" />
              </button>
            </div>,
            document.body,
          )
        : null}

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-h-[85vh] overflow-y-auto sm:max-w-md",
            // Fica acima da sobreposição do modo palco (z-100).
            isFullscreen && "z-[120]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyboardIcon className="size-4" />
              </span>
              Atalhos do modo palco
            </DialogTitle>
            <DialogDescription id="stage-help-description">
              Durante o culto, use o teclado sem tirar os olhos da cifra. Os
              atalhos valem com a tela cheia aberta.
            </DialogDescription>
          </DialogHeader>

          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/80">
            {STAGE_SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.label}
                className="flex items-center justify-between gap-3 bg-card px-3.5 py-2.5"
              >
                <span className="text-sm text-foreground">{shortcut.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key} className="min-w-6 px-1.5 py-0.5">
                      {key}
                    </Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Toque em “Tela cheia” para entrar no modo palco. A tela permanece
            acesa enquanto ele estiver aberto.
          </p>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 sm:h-9">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


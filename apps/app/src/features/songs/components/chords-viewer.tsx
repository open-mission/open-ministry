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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import {
  getSemitoneDistance,
  getShapeTone,
  isChordLine,
  parseSongSections,
  STANDARD_TONES,
  tokenizeChordLine,
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";
import { cn } from "@/lib/utils";
import { SectionBadge } from "./section-badge";

type ChordsViewerProps = {
  chords: string;
  originalTone?: string | null;
  capo?: number | null;
  songTitle?: string;
  songArtist?: string;
};

type FontSize = "sm" | "base" | "lg" | "xl";
type ViewMode = "sections" | "columns" | "continuous";

const FONT_SIZE_KEY = "openministry:songs:viewer:font-size";
const VIEW_MODE_KEY = "openministry:songs:viewer:view-mode";
const FONT_SIZES: FontSize[] = ["sm", "base", "lg", "xl"];
const VIEW_MODES: ViewMode[] = ["sections", "columns", "continuous"];

const FONT_CLASS: Record<FontSize, string> = {
  sm: "text-xs leading-relaxed",
  base: "text-sm leading-relaxed",
  lg: "text-base leading-loose",
  xl: "text-lg leading-loose font-medium sm:text-xl",
};

function readStoredPreference<T extends string>(
  key: string,
  allowed: readonly T[],
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : null;
  } catch {
    return null;
  }
}

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
}: ChordsViewerProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [viewMode, setViewMode] = useState<ViewMode>("sections");

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const safeCapo = Math.min(12, Math.max(0, Number(capo) || 0));

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
    try {
      window.localStorage.setItem(FONT_SIZE_KEY, fontSize);
    } catch {
      // Armazenamento indisponível (modo privado) — apenas ignora.
    }
  }, [fontSize]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Armazenamento indisponível (modo privado) — apenas ignora.
    }
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

  const toneOptions = useMemo(() => {
    const set = new Set<string>(STANDARD_TONES);
    if (originalTone) set.add(originalTone);
    return Array.from(set);
  }, [originalTone]);

  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  const toggleFullscreen = useCallback(
    () => setIsFullscreen((previous) => !previous),
    [],
  );

  const moveFontSize = useCallback((direction: 1 | -1) => {
    setFontSize((current) => {
      const index = FONT_SIZES.indexOf(current);
      const next = Math.min(
        FONT_SIZES.length - 1,
        Math.max(0, index + direction),
      );
      return FONT_SIZES[next] ?? current;
    });
  }, []);

  // Atalhos de teclado para ensaio e palco. Ignora campos de formulário.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='textbox']",
        )
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault();
          setSemitones((value) => value + 1);
          break;
        case "-":
        case "_":
          event.preventDefault();
          setSemitones((value) => value - 1);
          break;
        case "0":
          event.preventDefault();
          setSemitones(0);
          break;
        case "ArrowRight":
          event.preventDefault();
          setSemitones((value) => value + 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          setSemitones((value) => value - 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveFontSize(1);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFontSize(-1);
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (isFullscreen) {
            event.preventDefault();
            closeFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeFullscreen, isFullscreen, moveFontSize, toggleFullscreen]);

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
      if (event.key !== "Tab" || !container) return;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transposedText);
      setCopied(true);
      toast.success("Cifra copiada para a área de transferência!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

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
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
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
              label={`Tamanho da fonte ${index + 1}`}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-11 gap-1.5 px-3 text-xs font-medium shadow-2xs sm:h-9"
          aria-label={copied ? "Cifra copiada" : "Copiar cifra"}
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
      </div>
    </div>
  );

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
              <div className="flex shrink-0 flex-col gap-2.5 border-b border-border/70 bg-card/95 px-3.5 py-2.5 shadow-xs backdrop-blur-xs sm:px-6 sm:py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                    data-autofocus
                  >
                    <Minimize2Icon className="size-4" />
                    <span>Sair</span>
                    <kbd className="hidden rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] sm:inline">
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
    </div>
  );
}

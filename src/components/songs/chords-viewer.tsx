"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  FileMusicIcon,
  KanbanIcon,
  LayoutGridIcon,
  ListIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  Music2Icon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  isChordLine,
  parseSongSections,
  tokenizeChordLine,
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";
import { cn } from "@/lib/utils";
import { SectionBadge } from "./section-badge";

type ChordsViewerProps = {
  chords: string;
  originalTone?: string | null;
  songTitle?: string;
  songArtist?: string;
};

export function ChordsViewer({
  chords,
  originalTone,
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
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [viewMode, setViewMode] = useState<
    "sections" | "kanban" | "continuous"
  >("sections");

  // Sincronização com tecla ESC e Fullscreen API nativa do navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (
          document.documentElement.requestFullscreen &&
          !document.fullscreenElement
        ) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Fallback silencioso para o overlay fixo fixed inset-0
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignorado
      }
    }
  };

  const currentTone = useMemo(() => {
    if (!originalTone) return null;
    return transposeChord(originalTone, semitones);
  }, [originalTone, semitones]);

  const transposedText = useMemo(() => {
    return transposeChordsText(chords, semitones);
  }, [chords, semitones]);

  const sections = useMemo(() => {
    return parseSongSections(transposedText);
  }, [transposedText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transposedText);
      setCopied(true);
      toast.success("Cifra copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const fontSizeClass = {
    sm: "text-xs leading-relaxed",
    base: "text-sm leading-relaxed",
    lg: "text-base leading-loose",
    xl: "text-lg sm:text-xl leading-loose font-medium",
  }[fontSize];

  const renderChordLineHighlighted = (
    line: string,
    lineKey: string | number,
  ) => {
    if (isChordLine(line)) {
      const tokens = tokenizeChordLine(line);
      return (
        <div key={lineKey} className="font-mono">
          {tokens.map((token, tIdx) => {
            if (token.type === "chord") {
              return (
                <span
                  key={tIdx}
                  className="font-bold text-amber-700 select-text dark:text-amber-400"
                >
                  {token.value}
                </span>
              );
            }
            return <span key={tIdx}>{token.value}</span>;
          })}
        </div>
      );
    }

    // Linha de tablatura
    if (/^[eBGDAE]?\|[-0-9pbrh\/~\s|]+$/i.test(line.trim())) {
      return (
        <div key={lineKey} className="font-mono text-muted-foreground/75">
          {line}
        </div>
      );
    }

    // Letra comum
    return (
      <div key={lineKey} className="font-mono text-foreground">
        {line || "\u00A0"}
      </div>
    );
  };

  if (!chords || !chords.trim()) {
    return (
      <Card className="p-6 text-center">
        <FileMusicIcon className="mx-auto size-7 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">Nenhuma cifra cadastrada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clique em Editar para colar a cifra com acordes e tablaturas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* TOOLBAR DO MÚSICO COM ALTURAS PERFEITAS E SEM BORDAS QUE DESALINHAM */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs sm:p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* BADGE DE TOM HARMONIZADO COM A FONTE DA INTERFACE */}
          <div className="flex h-9 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs shadow-2xs">
            <span className="text-muted-foreground">Tom:</span>
            <span className="font-sans font-semibold text-sm text-foreground">
              {currentTone ?? (originalTone || "—")}
            </span>
            {semitones !== 0 ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {semitones > 0 ? `+${semitones}` : semitones}
              </span>
            ) : null}
          </div>

          {/* CONTROLE DE TRANSPOSIÇÃO DE SEMITONS SEGMENTADO */}
          <div className="inline-flex h-9 items-center rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setSemitones((s) => s - 1)}
              title="Diminuir 1 semitom (-1/2 tom)"
              className="flex h-7.5 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSemitones(0)}
              disabled={semitones === 0}
              title="Restaurar tom original"
              className={cn(
                "flex h-7.5 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
                semitones !== 0
                  ? "text-primary hover:bg-primary/10 font-semibold"
                  : "text-muted-foreground/60 cursor-default",
              )}
            >
              <RotateCcwIcon className="size-3" />
              <span>Original</span>
            </button>
            <button
              type="button"
              onClick={() => setSemitones((s) => s + 1)}
              title="Aumentar 1 semitom (+1/2 tom)"
              className="flex h-7.5 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CONTROLE DE TAMANHO DE FONTE SEGMENTADO */}
          <div className="inline-flex h-9 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              title="Tamanho pequeno"
              className={cn(
                "flex h-7.5 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-all",
                fontSize === "sm"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              title="Tamanho normal"
              className={cn(
                "flex h-7.5 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-all",
                fontSize === "base"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              title="Tamanho grande"
              className={cn(
                "flex h-7.5 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-all",
                fontSize === "lg"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setFontSize("xl")}
              title="Tamanho extra grande (palco/estante)"
              className={cn(
                "flex h-7.5 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-all",
                fontSize === "xl"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              A++
            </button>
          </div>

          {/* ALTERNADOR DE MODO DE VISUALIZAÇÃO SEGMENTADO (SEÇÕES / KANBAN / CONTÍNUA) */}
          <div className="inline-flex h-9 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("sections")}
              title="Ver em lista vertical de seções"
              className={cn(
                "flex h-7.5 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                viewMode === "sections"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGridIcon className="size-3.5" />
              <span className="hidden sm:inline">Seções</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              title="Ver em colunas horizontais (Kanban)"
              className={cn(
                "flex h-7.5 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <KanbanIcon className="size-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("continuous")}
              title="Visualização contínua"
              className={cn(
                "flex h-7.5 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                viewMode === "continuous"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListIcon className="size-3.5" />
              <span className="hidden sm:inline">Contínua</span>
            </button>
          </div>

          {/* BOTÃO COPIAR CIFRA */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-9 gap-1.5 px-3 text-xs font-medium shadow-2xs"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-600" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span className="hidden xs:inline">
              {copied ? "Copiado!" : "Copiar"}
            </span>
          </Button>

          {/* BOTÃO MODO TELA CHEIA */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            title="Modo Tela Cheia (ideal para tocar no ensaio/culto)"
            className="h-9 gap-1.5 px-3 text-xs font-medium shadow-2xs hover:bg-primary/10 hover:text-primary"
          >
            <Maximize2Icon className="size-3.5 text-primary" />
            <span className="hidden xs:inline font-semibold text-primary">
              Tela cheia
            </span>
          </Button>
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO DA CIFRA */}
      {viewMode === "sections" ? (
        <div className="space-y-3">
          {sections.map((section) => (
            <Card
              key={section.id}
              className="overflow-hidden border border-border/70 bg-card shadow-2xs transition-colors hover:border-border"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/15 px-3.5 py-1.5 sm:px-4 sm:py-2">
                <SectionBadge type={section.type} name={section.name} />
              </CardHeader>
              <CardContent className="overflow-x-auto px-3.5 py-3 sm:px-4 sm:py-3.5">
                <div
                  className={`font-mono select-text whitespace-pre ${fontSizeClass}`}
                >
                  {section.content.split("\n").map((line, lIdx) =>
                    renderChordLineHighlighted(line, lIdx),
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        /* VISUALIZAÇÃO EM KANBAN (COLUNAS HORIZONTAIS COM LARGURA AMPLA SEM SCROLL INTERNO) */
        <div className="relative">
          <div className="flex items-start gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin]">
            {sections.map((section) => (
              <div
                key={section.id}
                className="flex w-[86vw] max-w-[460px] shrink-0 snap-start flex-col rounded-xl border border-border/70 bg-card shadow-2xs transition-colors hover:border-border sm:w-[420px] lg:w-[460px]"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2.5">
                  <SectionBadge type={section.type} name={section.name} />
                </div>
                <div className="max-h-[72vh] overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-5 sm:py-3.5">
                  <div
                    className={`font-mono select-text whitespace-pre ${fontSizeClass}`}
                  >
                    {section.content.split("\n").map((line, lIdx) =>
                      renderChordLineHighlighted(line, lIdx),
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO CONTÍNUA */
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs sm:p-5">
          <div
            className={`font-mono select-text whitespace-pre ${fontSizeClass}`}
          >
            {transposedText.split("\n").map((line, lIdx) =>
              renderChordLineHighlighted(line, lIdx),
            )}
          </div>
        </div>
      )}

      {/* APRESENTAÇÃO COMPLETA EM TELA CHEIA (FULLSCREEN PORTAL) */}
      {isFullscreen && isClient
        ? createPortal(
            <div className="fixed inset-0 z-100 flex flex-col bg-background text-foreground animate-in fade-in-0 duration-150">
              {/* HEADER DO FULLSCREEN COM CONTROLES COMPLETOS */}
              <div className="flex shrink-0 flex-col gap-2.5 border-b border-border/70 bg-card/95 backdrop-blur-xs px-3.5 py-2.5 sm:px-6 sm:py-3 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  {/* TÍTULO E ARTISTA DA MÚSICA */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Music2Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-sm font-bold text-foreground sm:text-base">
                        {songTitle || "Cifra da Música"}
                      </h2>
                      {songArtist ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {songArtist}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* AÇÕES PRINCIPAIS (COPIAR & SAIR DO FULLSCREEN) */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 gap-1.5 px-2.5 text-xs font-medium shadow-2xs sm:h-8.5 sm:px-3"
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

                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-2xs sm:h-8.5 sm:px-3.5"
                      title="Sair do modo tela cheia (ESC)"
                    >
                      <Minimize2Icon className="size-3.5" />
                      <span>Sair</span>
                      <kbd className="hidden rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-mono sm:inline">
                        ESC
                      </kbd>
                    </Button>
                  </div>
                </div>

                {/* BARRA DE CONTROLES DO MÚSICO (TRANSPOSE, FONTE, MODOS) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* BADGE DE TOM */}
                    <div className="flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 text-xs shadow-2xs sm:h-8.5 sm:px-3">
                      <span className="text-muted-foreground">Tom:</span>
                      <span className="font-sans font-semibold text-sm text-foreground">
                        {currentTone ?? (originalTone || "—")}
                      </span>
                      {semitones !== 0 ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {semitones > 0 ? `+${semitones}` : semitones}
                        </span>
                      ) : null}
                    </div>

                    {/* CONTROLE DE TRANSPOSIÇÃO DE SEMITONS */}
                    <div className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs sm:h-8.5">
                      <button
                        type="button"
                        onClick={() => setSemitones((s) => s - 1)}
                        title="Diminuir 1 semitom (-1/2 tom)"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 sm:h-7.5 sm:w-8"
                      >
                        <MinusIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSemitones(0)}
                        disabled={semitones === 0}
                        title="Restaurar tom original"
                        className={cn(
                          "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors sm:h-7.5 sm:px-2.5",
                          semitones !== 0
                            ? "text-primary hover:bg-primary/10 font-semibold"
                            : "text-muted-foreground/60 cursor-default",
                        )}
                      >
                        <RotateCcwIcon className="size-3" />
                        <span className="hidden xs:inline">Original</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSemitones((s) => s + 1)}
                        title="Aumentar 1 semitom (+1/2 tom)"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 sm:h-7.5 sm:w-8"
                      >
                        <PlusIcon className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* TAMANHO DA FONTE */}
                    <div className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs sm:h-8.5">
                      <button
                        type="button"
                        onClick={() => setFontSize("sm")}
                        title="Tamanho pequeno"
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-all sm:h-7.5 sm:px-2.5",
                          fontSize === "sm"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize("base")}
                        title="Tamanho normal"
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-all sm:h-7.5 sm:px-2.5",
                          fontSize === "base"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize("lg")}
                        title="Tamanho grande"
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-all sm:h-7.5 sm:px-2.5",
                          fontSize === "lg"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        A+
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize("xl")}
                        title="Tamanho extra grande (estante/palco)"
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-all sm:h-7.5 sm:px-2.5",
                          fontSize === "xl"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        A++
                      </button>
                    </div>

                    {/* SELETOR DE MODOS (SEÇÕES / KANBAN / CONTÍNUA) */}
                    <div className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs sm:h-8.5">
                      <button
                        type="button"
                        onClick={() => setViewMode("sections")}
                        title="Ver em lista vertical de seções"
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all sm:h-7.5",
                          viewMode === "sections"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <LayoutGridIcon className="size-3.5" />
                        <span className="hidden sm:inline">Seções</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("kanban")}
                        title="Ver em colunas horizontais (Kanban)"
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all sm:h-7.5",
                          viewMode === "kanban"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <KanbanIcon className="size-3.5" />
                        <span className="hidden sm:inline">Kanban</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("continuous")}
                        title="Visualização contínua"
                        className={cn(
                          "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all sm:h-7.5",
                          viewMode === "continuous"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <ListIcon className="size-3.5" />
                        <span className="hidden sm:inline">Contínua</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORPO DO FULLSCREEN COM O MODO SELECIONADO */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === "sections" ? (
                  <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-4xl space-y-3.5">
                      {sections.map((section) => (
                        <Card
                          key={section.id}
                          className="overflow-hidden border border-border/70 bg-card shadow-xs transition-colors hover:border-border"
                        >
                          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/15 px-4 py-2 sm:px-5 sm:py-2.5">
                            <SectionBadge
                              type={section.type}
                              name={section.name}
                            />
                          </CardHeader>
                          <CardContent className="overflow-x-auto px-4 py-3 sm:px-5 sm:py-4">
                            <div
                              className={`font-mono select-text whitespace-pre ${fontSizeClass}`}
                            >
                              {section.content.split("\n").map((line, lIdx) =>
                                renderChordLineHighlighted(line, lIdx),
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : viewMode === "kanban" ? (
                  <div className="h-full p-3 sm:p-5">
                    <div className="flex h-full min-h-0 items-start gap-4 overflow-x-auto pb-2 snap-x scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin]">
                      {sections.map((section) => (
                        <div
                          key={section.id}
                          className="flex h-full min-h-0 w-[86vw] max-w-[480px] shrink-0 snap-start flex-col rounded-xl border border-border/70 bg-card shadow-xs transition-colors hover:border-border sm:w-[440px] lg:w-[480px]"
                        >
                          <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2.5">
                            <SectionBadge
                              type={section.type}
                              name={section.name}
                            />
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3.5 sm:px-5 sm:py-4">
                            <div
                              className={`font-mono select-text whitespace-pre ${fontSizeClass}`}
                            >
                              {section.content.split("\n").map((line, lIdx) =>
                                renderChordLineHighlighted(line, lIdx),
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-4xl overflow-x-auto rounded-xl border border-border/70 bg-card p-5 shadow-xs sm:p-7">
                      <div
                        className={`font-mono select-text whitespace-pre ${fontSizeClass}`}
                      >
                        {transposedText.split("\n").map((line, lIdx) =>
                          renderChordLineHighlighted(line, lIdx),
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

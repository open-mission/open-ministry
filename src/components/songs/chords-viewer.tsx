"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  FileMusicIcon,
  LayoutGridIcon,
  ListIcon,
  MinusIcon,
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
};

export function ChordsViewer({ chords, originalTone }: ChordsViewerProps) {
  const [semitones, setSemitones] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [viewMode, setViewMode] = useState<"sections" | "continuous">(
    "sections",
  );

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
          </div>

          {/* ALTERNADOR DE MODO DE VISUALIZAÇÃO SEGMENTADO */}
          <div className="inline-flex h-9 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("sections")}
              title="Ver em cards por seção"
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
            className="h-9 gap-1.5 px-3.5 text-xs font-medium shadow-2xs"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-600" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span className="hidden xs:inline">
              {copied ? "Copiado!" : "Copiar cifra"}
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
    </div>
  );
}

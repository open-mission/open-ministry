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
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  isChordLine,
  parseSongSections,
  tokenizeChordLine,
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";
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

  const renderChordLineHighlighted = (line: string, lineKey: string | number) => {
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
      <Card className="p-8 text-center">
        <FileMusicIcon className="mx-auto size-8 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">Nenhuma cifra cadastrada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clique em Editar para colar a cifra com acordes e tablaturas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* TOOLBAR DO MÚSICO ERGONÔMICA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs sm:p-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BADGE DE TOM */}
          <div className="flex h-9 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 font-medium shadow-2xs">
            <span className="text-xs text-muted-foreground">Tom:</span>
            <span className="font-heading text-sm font-bold text-primary">
              {currentTone ?? (originalTone || "—")}
            </span>
            {semitones !== 0 ? (
              <span className="ml-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {semitones > 0 ? `+${semitones}` : semitones}
              </span>
            ) : null}
          </div>

          {/* GRUPO DE TRANSPOSIÇÃO DE SEMITONS */}
          <ButtonGroup className="h-9">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSemitones((s) => s - 1)}
              title="Diminuir 1 semitom (-1/2 tom)"
              className="h-9 w-9 p-0"
            >
              <MinusIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSemitones(0)}
              disabled={semitones === 0}
              title="Restaurar tom original"
              className="h-9 px-3 text-xs font-medium"
            >
              <RotateCcwIcon className="mr-1.5 size-3.5" />
              Original
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSemitones((s) => s + 1)}
              title="Aumentar 1 semitom (+1/2 tom)"
              className="h-9 w-9 p-0"
            >
              <PlusIcon className="size-4" />
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* GRUPO DE TAMANHO DE FONTE */}
          <ButtonGroup className="h-9">
            <Button
              type="button"
              variant={fontSize === "sm" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFontSize("sm")}
              title="Tamanho pequeno"
              className="h-9 px-2.5 text-xs font-semibold"
            >
              A-
            </Button>
            <Button
              type="button"
              variant={fontSize === "base" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFontSize("base")}
              title="Tamanho normal"
              className="h-9 px-2.5 text-xs font-semibold"
            >
              A
            </Button>
            <Button
              type="button"
              variant={fontSize === "lg" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFontSize("lg")}
              title="Tamanho grande"
              className="h-9 px-2.5 text-xs font-semibold"
            >
              A+
            </Button>
          </ButtonGroup>

          {/* ALTERNADOR DE MODO DE VISUALIZAÇÃO */}
          <ButtonGroup className="h-9">
            <Button
              type="button"
              variant={viewMode === "sections" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setViewMode("sections")}
              title="Ver em cards por seção"
              className="h-9 px-2.5 text-xs font-medium gap-1"
            >
              <LayoutGridIcon className="size-3.5" />
              <span className="hidden sm:inline">Seções</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "continuous" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setViewMode("continuous")}
              title="Visualização contínua"
              className="h-9 px-2.5 text-xs font-medium gap-1"
            >
              <ListIcon className="size-3.5" />
              <span className="hidden sm:inline">Contínua</span>
            </Button>
          </ButtonGroup>

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
        <div className="space-y-3.5">
          {sections.map((section) => (
            <Card
              key={section.id}
              className="overflow-hidden border border-border/80 bg-card shadow-2xs transition-shadow hover:shadow-xs"
            >
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2.5 sm:px-5">
                <SectionBadge type={section.type} name={section.name} />
              </CardHeader>
              <CardContent className="overflow-x-auto p-4 sm:p-5">
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
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-6">
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

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";

type ChordsViewerProps = {
  chords: string;
  originalTone?: string | null;
};

export function ChordsViewer({ chords, originalTone }: ChordsViewerProps) {
  const [semitones, setSemitones] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  const currentTone = useMemo(() => {
    if (!originalTone) return null;
    return transposeChord(originalTone, semitones);
  }, [originalTone, semitones]);

  const transposedText = useMemo(() => {
    return transposeChordsText(chords, semitones);
  }, [chords, semitones]);

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

  return (
    <div className="space-y-3">
      {/* TOOLBAR DO MÚSICO */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card p-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-muted-foreground">Tom:</span>
          <span className="inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-1 font-heading text-sm font-semibold text-primary">
            {currentTone ?? (originalTone || "Não informado")}
            {semitones !== 0 ? (
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                ({semitones > 0 ? `+${semitones}` : semitones})
              </span>
            ) : null}
          </span>

          <div className="flex items-center gap-1 border-l border-border/70 pl-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSemitones((s) => s - 1)}
              title="Diminuir 1 semitom (-1/2 tom)"
              className="size-7 p-0"
            >
              <MinusIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSemitones(0)}
              disabled={semitones === 0}
              title="Restaurar tom original"
              className="h-7 px-2 text-[11px]"
            >
              <RotateCcwIcon className="mr-1 size-3" />
              Original
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSemitones((s) => s + 1)}
              title="Aumentar 1 semitom (+1/2 tom)"
              className="size-7 p-0"
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SELETOR DE TAMANHO DE FONTE */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setFontSize("sm")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                fontSize === "sm"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize("base")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                fontSize === "base"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize("lg")}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                fontSize === "lg"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              A+
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleCopy}
            className="h-7 gap-1 text-[11px]"
          >
            {copied ? (
              <CheckIcon className="size-3 text-emerald-600" />
            ) : (
              <CopyIcon className="size-3" />
            )}
            {copied ? "Copiado!" : "Copiar cifra"}
          </Button>
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO DA CIFRA */}
      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs">
        <pre
          className={`font-mono text-foreground select-text whitespace-pre ${fontSizeClass}`}
        >
          {transposedText}
        </pre>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { parseSongSections } from "@/lib/music/chords-utils";
import { SectionBadge } from "./section-badge";

type SongLyricsViewerProps = {
  lyrics: string;
};

export function SongLyricsViewer({ lyrics }: SongLyricsViewerProps) {
  const [copied, setCopied] = useState(false);

  const sections = useMemo(() => {
    return parseSongSections(lyrics);
  }, [lyrics]);

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

  return (
    <div className="space-y-3">
      {/* TOOLBAR DA LETRA COMPACTA */}
      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <FileTextIcon className="size-3.5 text-primary" />
          <span className="font-medium text-foreground">
            Letra Estruturada
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {sections.length} {sections.length === 1 ? "seção" : "seções"}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-1.5 px-3 text-xs font-medium shadow-2xs"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-600" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          <span>{copied ? "Copiado!" : "Copiar letra"}</span>
        </Button>
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
            <CardContent className="px-3.5 py-2.5 sm:px-4 sm:py-3.5">
              <div className="whitespace-pre-line font-sans text-sm leading-relaxed text-foreground sm:text-[15px]">
                {section.content}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

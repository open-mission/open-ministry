"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyColorButton({ hex, label }: { hex: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      toast.success(`${label} (${hex}) copiado para a área de transferência!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar cor");
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
      title={`Copiar ${hex}`}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-primary" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
      <span>{hex}</span>
    </button>
  );
}

export function AssetActionButtons({
  svgPath,
  pngPath,
  name,
}: {
  svgPath: string;
  pngPath?: string;
  name: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopySvg = async () => {
    try {
      const res = await fetch(svgPath);
      const svgText = await res.text();
      await navigator.clipboard.writeText(svgText);
      setCopied(true);
      toast.success(`SVG de ${name} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar código SVG");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopySvg}
        className="h-8 gap-1.5 text-xs cursor-pointer"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-primary" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
        Copiar SVG
      </Button>

      <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 text-xs">
        <a href={svgPath} download>
          <DownloadIcon className="size-3.5" />
          Baixar SVG
        </a>
      </Button>

      {pngPath ? (
        <Button size="sm" variant="secondary" asChild className="h-8 gap-1.5 text-xs">
          <a href={pngPath} download>
            <DownloadIcon className="size-3.5" />
            Baixar PNG
          </a>
        </Button>
      ) : null}
    </div>
  );
}

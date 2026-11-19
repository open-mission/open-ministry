"use client";

import { useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  ImageIcon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Button } from "@/components/ui/button";

export type VerseCardActionsProps = {
  content: string;
  reference: string;
  versionName: string;
  imageUrl: string | null;
};

export function VerseCardActions({
  content,
  reference,
  versionName,
  imageUrl,
}: VerseCardActionsProps) {
  const [copied, setCopied] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const shareText = `“${content}” — ${reference} (${versionName})`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Versículo copiado!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Versículo do Dia: ${reference}`,
          text: shareText,
        });
        return;
      } catch {
        // Usuário cancelou: mantém o fallback de cópia.
      }
    }
    await handleCopy();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-h-[44px] gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-primary" aria-hidden="true" />
          ) : (
            <CopyIcon className="size-3.5" aria-hidden="true" />
          )}
          {copied ? "Copiado" : "Copiar"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-h-[44px] gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleShare}
        >
          <Share2Icon className="size-3.5" aria-hidden="true" />
          Compartilhar
        </Button>

        {imageUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setImageOpen(true)}
          >
            <ImageIcon className="size-3.5" aria-hidden="true" />
            Ver imagem
          </Button>
        ) : null}
      </div>

      {imageUrl ? (
        <ResponsiveDialog
          open={imageOpen}
          onOpenChange={setImageOpen}
          title={reference}
          titleClassName="text-base sm:text-lg"
          description={`Imagem ilustrativa do versículo do dia: ${reference}`}
          contentClassName="sm:max-w-md"
          bodyClassName="mt-2"
          footer={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] w-full sm:ml-auto sm:w-auto"
              onClick={handleShare}
            >
              <Share2Icon className="size-3.5 mr-1" aria-hidden="true" />
              Compartilhar
            </Button>
          }
        >
          <div className="relative overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Versículo do dia: ${reference}`}
              width={1200}
              height={675}
              loading="lazy"
              decoding="async"
              className="h-auto w-full object-cover"
            />
          </div>
        </ResponsiveDialog>
      ) : null}
    </>
  );
}

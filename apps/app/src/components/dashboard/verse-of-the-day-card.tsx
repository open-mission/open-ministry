"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CopyIcon,
  ImageIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VerseOfTheDayData } from "@/lib/youversion";

export function VerseOfTheDayCard({
  verse,
}: {
  verse: VerseOfTheDayData;
}) {
  const [copied, setCopied] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const shareText = `"${verse.content}" — ${verse.reference} (${verse.versionName})`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Versículo copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Versículo do Dia: ${verse.reference}`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback para cópia
      }
    }
    void handleCopy();
  };

  return (
    <>
      <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-amber-500/[0.04] via-card to-primary/[0.02] shadow-xs transition-all hover:shadow-sm">
        {/* Subtle decorative glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden="true"
        />

        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Header info bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <SparklesIcon className="size-3.5" aria-hidden="true" />
                </div>
                <span className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Versículo do Dia
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-5 border-border/60 bg-background/60 px-2 text-[10px] font-medium text-muted-foreground"
                >
                  {verse.versionName} • YouVersion
                </Badge>
              </div>
            </div>

            {/* Verse content */}
            <blockquote className="space-y-2">
              <p className="font-serif text-base sm:text-lg leading-relaxed text-foreground tracking-tight italic">
                “{verse.content}”
              </p>
              <cite className="block not-italic font-semibold text-xs sm:text-sm text-foreground/80">
                — {verse.reference}
              </cite>
            </blockquote>

            {/* Actions toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <CopyIcon className="size-3.5" aria-hidden="true" />
                  )}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleShare}
                >
                  <Share2Icon className="size-3.5" aria-hidden="true" />
                  <span>Compartilhar</span>
                </Button>

                {verse.imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setImageDialogOpen(true)}
                  >
                    <ImageIcon className="size-3.5" aria-hidden="true" />
                    <span>Ver imagem</span>
                  </Button>
                ) : null}
              </div>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="group h-8 gap-1.5 px-2.5 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 ml-auto"
              >
                <Link
                  href={`/dashboard/bible?passage=${encodeURIComponent(verse.passageId)}`}
                >
                  <BookOpenIcon className="size-3.5" aria-hidden="true" />
                  <span>Abrir na Bíblia</span>
                  <ArrowRightIcon
                    data-icon="inline-end"
                    className="size-3 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para exibir a imagem do versículo fornecida pelo YouVersion */}
      {verse.imageUrl ? (
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                {verse.reference}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Imagem ilustrativa do versículo do dia: {verse.reference}
              </DialogDescription>
            </DialogHeader>
            <div className="relative mt-2 overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={verse.imageUrl}
                alt={`Versículo do dia: ${verse.reference}`}
                width={1200}
                height={675}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2Icon className="size-3.5 mr-1" aria-hidden="true" />
                Compartilhar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

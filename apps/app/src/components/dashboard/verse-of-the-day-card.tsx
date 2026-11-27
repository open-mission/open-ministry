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

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VerseOfTheDayData } from "@/lib/youversion";

export function VerseOfTheDayCard({
  verse,
  variant = "full",
}: {
  verse: VerseOfTheDayData;
  /**
   * `compact` é o bloco curto da primeira dobra mobile: título, referência,
   * cópia e link para a Bíblia, sem a barra de ações completa.
   */
  variant?: "full" | "compact";
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
      {variant === "compact" ? (
        <Card className="border-border/70 bg-card shadow-xs">
          <CardContent className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 font-heading text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                <SparklesIcon
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="truncate">Versículo do Dia</span>
              </span>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 min-h-8 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckIcon
                      className="size-3.5 text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <CopyIcon className="size-3.5" aria-hidden="true" />
                  )}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 min-h-8 gap-1 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Link
                    href={`/bible?passage=${encodeURIComponent(verse.passageId)}`}
                  >
                    <BookOpenIcon className="size-3.5" aria-hidden="true" />
                    <span>Abrir na Bíblia</span>
                  </Link>
                </Button>
              </div>
            </div>

            <blockquote className="min-w-0">
              <p className="line-clamp-2 font-serif text-[13px] leading-snug tracking-tight text-foreground italic">
                “{verse.content}”
              </p>
              <cite className="mt-0.5 block truncate text-[11px] font-medium not-italic text-muted-foreground">
                — {verse.reference}
              </cite>
            </blockquote>
          </CardContent>
        </Card>
      ) : (
        <Card className="relative overflow-hidden border-border/70 bg-linear-to-br from-amber-500/4 via-card to-primary/2 shadow-xs transition-all hover:shadow-sm">
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
                  className="h-5 border-border/60 bg-background/60 px-2 text-[11px] font-medium text-muted-foreground"
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
                  href={`/bible?passage=${encodeURIComponent(verse.passageId)}`}
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
      )}

      {/* Painel responsivo para exibir a imagem do versículo fornecida pelo YouVersion */}
      {variant === "full" && verse.imageUrl ? (
        <ResponsiveDialog
          open={imageDialogOpen}
          onOpenChange={setImageDialogOpen}
          title={verse.reference}
          titleClassName="text-base sm:text-lg"
          description={`Imagem ilustrativa do versículo do dia: ${verse.reference}`}
          contentClassName="sm:max-w-md"
          bodyClassName="mt-2"
          footer={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 w-full sm:ml-auto sm:w-auto"
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
              src={verse.imageUrl}
              alt={`Versículo do dia: ${verse.reference}`}
              width={1200}
              height={675}
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-cover"
            />
          </div>
        </ResponsiveDialog>
      ) : null}
    </>
  );
}

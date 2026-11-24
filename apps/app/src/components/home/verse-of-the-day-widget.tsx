"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CopyIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsBelowLg } from "@/hooks/use-is-below-lg";
import { cn } from "@/lib/utils";
import type { VerseOfTheDayData } from "@/lib/youversion";

export type VerseCardVariant = "card" | "folio" | "compact" | "full";

type ImageStatus = "idle" | "loading" | "loaded" | "error";

function bibleHref(passageId: string) {
  return `/bible?passage=${encodeURIComponent(passageId)}`;
}

/**
 * Arte pastoral em verde-floresta e ocre dourado usada sempre que o
 * YouVersion não envia imagem — o card nunca fica com uma caixa vazia.
 */
function VersePastoralArt({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-[#1e472f]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="size-full" role="presentation">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c5b3f" />
            <stop offset="100%" stopColor="#1a3c28" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" fill={`url(#${gradientId})`} />
        <circle cx="35" cy="12" r="6.5" fill="#c9a24b" opacity="0.9" />
        <path d="M0 30 L11 21 L19 27 L29 17 L48 29 V48 H0 Z" fill="#24513a" />
        <path d="M0 38 L13 29 L23 35 L34 26 L48 36 V48 H0 Z" fill="#3f7a55" />
        <path d="M0 44 L14 37 L26 42 L36 36 L48 43 V48 H0 Z" fill="#1a3c28" />
      </svg>
    </span>
  );
}

function VerseThumbnail({
  verse,
  status,
  retryKey,
  onLoad,
  onError,
  size = "md",
}: {
  verse: VerseOfTheDayData;
  status: ImageStatus;
  retryKey: number;
  onLoad: () => void;
  onError: () => void;
  size?: "md" | "lg";
}) {
  const dimensions = size === "lg" ? "size-[52px]" : "size-12";

  const handleImageRef = (node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0 && status !== "loaded") {
      onLoad();
    }
  };

  if (verse.imageUrl && status !== "error") {
    return (
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-secondary",
          dimensions,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={retryKey}
          ref={handleImageRef}
          src={verse.imageUrl}
          alt=""
          width={104}
          height={104}
          loading="eager"
          decoding="async"
          onLoad={onLoad}
          onError={onError}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return <VersePastoralArt className={cn("rounded-lg", dimensions)} />;
}

function VerseEditorialArt({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 bg-accent/70 p-5 text-accent-foreground",
        className,
      )}
    >
      <span className="font-heading text-sm font-semibold tracking-[0.14em] uppercase">
        Palavra do dia
      </span>
      <span
        className="font-heading text-3xl leading-none text-primary"
        aria-hidden="true"
      >
        “
      </span>
    </div>
  );
}

/**
 * Área de arte do versículo dentro do Drawer/Dialog. Preserva a altura em
 * todos os estados: imagem, carregando, erro e ausência de imagem.
 */
function VerseArtPanel({
  verse,
  status,
  retryKey,
  onLoad,
  onError,
  onRetry,
  className,
}: {
  verse: VerseOfTheDayData;
  status: ImageStatus;
  retryKey: number;
  onLoad: () => void;
  onError: () => void;
  onRetry: () => void;
  className?: string;
}) {
  if (!verse.imageUrl) {
    return (
      <VerseEditorialArt
        className={cn("aspect-video w-full rounded-xl", className)}
      />
    );
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive",
          className,
        )}
      >
        <p className="text-sm font-medium">
          Não foi possível carregar a imagem
        </p>
        <p className="text-[11px] leading-relaxed">
          Texto completo disponível para leitura e cópia.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 border-destructive/30 text-destructive hover:text-destructive"
          onClick={onRetry}
        >
          Tentar
        </Button>
      </div>
    );
  }

  const loaded = status === "loaded";

  const handleImageRef = (node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0 && status !== "loaded") {
      onLoad();
    }
  };

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-secondary",
        className,
      )}
    >
      {loaded ? null : (
        <div
          className="absolute inset-0 flex items-center justify-center p-4 text-center"
          aria-live="polite"
        >
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
            Carregando imagem do YouVersion...
          </p>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={retryKey}
        ref={handleImageRef}
        src={verse.imageUrl}
        alt={`Arte do versículo: ${verse.reference}`}
        width={1200}
        height={675}
        loading="eager"
        decoding="async"
        onLoad={onLoad}
        onError={onError}
        className={cn(
          "size-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

function VerseActions({
  verse,
  copied,
  onCopy,
  onShare,
  layout = "row",
  density = "touch",
}: {
  verse: VerseOfTheDayData;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  layout?: "row" | "stack";
  density?: "touch" | "desktop";
}) {
  const stacked = layout === "stack";
  const actionHeight = density === "desktop" ? "min-h-10" : "min-h-11";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        stacked && "flex-col items-stretch",
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        className={cn(
          "min-w-[104px] justify-center gap-1.5",
          actionHeight,
          stacked && "w-full",
        )}
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
        variant="outline"
        size="sm"
        onClick={onShare}
        className={cn("gap-1.5", actionHeight, stacked && "w-full")}
      >
        <Share2Icon className="size-3.5" aria-hidden="true" />
        Compartilhar
      </Button>

      <Button
        asChild
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1.5 text-primary hover:bg-primary/10 hover:text-primary",
          actionHeight,
          stacked && "w-full",
        )}
      >
        <Link href={bibleHref(verse.passageId)}>
          <BookOpenIcon className="size-3.5" aria-hidden="true" />
          Abrir na Bíblia
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

export function VerseOfTheDayWidget({
  verse,
  variant = "card",
}: {
  verse: VerseOfTheDayData;
  variant?: VerseCardVariant;
}) {
  const isBelowLg = useIsBelowLg();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [imageStatus, setImageStatus] = useState<ImageStatus>(
    verse.imageUrl ? "loading" : "idle",
  );

  const shareText = `“${verse.content}” — ${verse.reference} (${verse.versionName})`;

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
          title: `Versículo do Dia: ${verse.reference}`,
          text: shareText,
        });
        return;
      } catch {
        // Usuário cancelou: mantém o fallback de cópia.
      }
    }

    await handleCopy();
  };

  const handleRetry = () => {
    setImageStatus("loading");
    setRetryKey((current) => current + 1);
  };

  const isFolio = variant === "folio";
  const artPanel = (
    <VerseArtPanel
      verse={verse}
      status={imageStatus}
      retryKey={retryKey}
      onLoad={() => setImageStatus("loaded")}
      onError={() => setImageStatus("error")}
      onRetry={handleRetry}
    />
  );
  const dialogArtPanel = (
    <VerseArtPanel
      verse={verse}
      status={imageStatus}
      retryKey={retryKey}
      onLoad={() => setImageStatus("loaded")}
      onError={() => setImageStatus("error")}
      onRetry={handleRetry}
      className="sm:aspect-square sm:min-h-[260px]"
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Abrir versículo do dia: ${verse.reference}`}
        className={cn(
          "group flex min-h-11 w-full items-center gap-3 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isFolio
            ? "border-0 bg-transparent py-1 hover:bg-muted/40"
            : "border border-border/70 bg-card p-3 shadow-xs hover:border-primary/30",
        )}
      >
        <VerseThumbnail
          verse={verse}
          status={imageStatus}
          retryKey={retryKey}
          onLoad={() => setImageStatus("loaded")}
          onError={() => setImageStatus("error")}
          size={isFolio ? "lg" : "md"}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase xl:tracking-[0.14em]">
              Versículo · YouVersion
            </span>
            <span className="shrink-0 text-[11px] font-medium text-primary">
              Ver arte ›
            </span>
          </span>

          <span className="line-clamp-2 font-heading text-sm leading-snug tracking-tight text-foreground italic">
            “{verse.content}”
          </span>

          <span className="truncate text-[11px] text-muted-foreground">
            {verse.reference} · {verse.versionName}
          </span>
        </span>
      </button>

      {isBelowLg ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85dvh] bg-popover">
            <DrawerHeader className="!text-left">
              <DrawerTitle className="font-heading text-lg">
                {verse.reference}
              </DrawerTitle>
              <DrawerDescription className="text-[11px]">
                {verse.versionName} · YouVersion
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-2 [-webkit-overflow-scrolling:touch]">
              <div className="flex flex-col gap-3">
                {artPanel}
                <blockquote className="space-y-1.5">
                  <p className="font-heading text-base leading-relaxed tracking-tight text-foreground italic">
                    “{verse.content}”
                  </p>
                  <cite className="block text-[11px] font-medium text-muted-foreground not-italic">
                    {verse.reference} · {verse.versionName}
                  </cite>
                </blockquote>
              </div>
            </div>

            <DrawerFooter className="border-t border-border/60">
              <VerseActions
                verse={verse}
                copied={copied}
                onCopy={handleCopy}
                onShare={handleShare}
                layout="stack"
              />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="gap-0 overflow-hidden p-0 sm:max-w-[700px]"
            showCloseButton={false}
          >
            <div className="grid sm:grid-cols-[260px_1fr]">
              <div className="bg-secondary sm:flex sm:h-full sm:items-center sm:justify-center">
                {dialogArtPanel}
              </div>

              <div className="flex flex-col gap-4 p-5">
                <DialogHeader className="gap-1 pr-8">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Versículo · YouVersion
                  </p>
                  <DialogTitle className="font-heading text-lg leading-tight">
                    {verse.reference}
                  </DialogTitle>
                  <DialogDescription className="text-[11px]">
                    {verse.versionName} · YouVersion
                  </DialogDescription>
                </DialogHeader>

                <blockquote>
                  <p className="font-heading text-base leading-relaxed tracking-tight text-foreground italic">
                    “{verse.content}”
                  </p>
                </blockquote>

                <VerseActions
                  verse={verse}
                  copied={copied}
                  onCopy={handleCopy}
                  onShare={handleShare}
                  density="desktop"
                />

                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                    aria-label="Fechar versículo"
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

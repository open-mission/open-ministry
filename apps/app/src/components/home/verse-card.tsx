import Link from "next/link";
import { BookOpenIcon, SparklesIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { VerseCardActions } from "@/components/home/verse-card-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VerseOfTheDayData } from "@/lib/youversion";

export function VerseCard({ verse }: { verse: VerseOfTheDayData }) {
  return (
    <HomeCard className="border-primary/15 bg-card">
      <HomeCardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="font-heading text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Versículo do dia
            </span>
          </div>
          <Badge
            variant="outline"
            className="h-6 bg-background/60 px-2 text-[11px] font-medium text-muted-foreground"
          >
            {verse.versionName} • YouVersion
          </Badge>
        </div>

        <blockquote className="space-y-2">
          <p className="font-heading text-lg leading-relaxed tracking-tight text-foreground italic sm:text-xl">
            “{verse.content}”
          </p>
          <cite className="block text-xs font-semibold text-muted-foreground not-italic sm:text-sm">
            — {verse.reference}
          </cite>
        </blockquote>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
          <VerseCardActions
            content={verse.content}
            reference={verse.reference}
            versionName={verse.versionName}
            imageUrl={verse.imageUrl}
          />

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="group h-9 min-h-[44px] gap-1.5 px-2.5 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link
              href={`/dashboard/bible?passage=${encodeURIComponent(verse.passageId)}`}
            >
              <BookOpenIcon className="size-3.5" aria-hidden="true" />
              Abrir na Bíblia
            </Link>
          </Button>
        </div>
      </HomeCardContent>
    </HomeCard>
  );
}

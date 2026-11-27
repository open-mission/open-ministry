"use client";

import type { SongSection } from "@/lib/music/chords-utils";
import { cn } from "@/lib/utils";

type SectionJumpPillsProps = {
  sections: SongSection[];
  onJump: (sectionKey: string) => void;
  label?: string;
  className?: string;
};

/**
 * Atalhos horizontais para pular direto a uma seção da cifra/letra durante o
 * culto. Só aparece quando há mais de uma seção para navegar.
 */
export function SectionJumpPills({
  sections,
  onJump,
  label = "Ir para seção",
  className,
}: SectionJumpPillsProps) {
  if (sections.length < 2) return null;

  return (
    <div
      data-slot="section-jump-pills"
      role="group"
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none",
        className,
      )}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onJump(section.key)}
          title={`Ir para ${section.name}`}
          className="min-h-11 shrink-0 rounded-full border border-border/70 bg-background px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 sm:px-2.5"
        >
          {section.name}
        </button>
      ))}
    </div>
  );
}

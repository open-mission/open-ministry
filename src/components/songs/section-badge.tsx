import type { SongSectionType } from "@/lib/music/chords-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  SongSectionType,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  intro: {
    label: "Intro",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200",
    dotClass: "bg-emerald-500",
  },
  verse: {
    label: "Verso",
    badgeClass:
      "border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/25 dark:text-emerald-200",
    dotClass: "bg-primary",
  },
  "pre-chorus": {
    label: "Pré-Refrão",
    badgeClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-200",
    dotClass: "bg-sky-500",
  },
  chorus: {
    label: "Refrão",
    badgeClass:
      "border-amber-500/40 bg-amber-500/15 text-amber-900 font-semibold dark:border-amber-400/40 dark:bg-amber-500/25 dark:text-amber-200",
    dotClass: "bg-amber-500 animate-pulse",
  },
  bridge: {
    label: "Ponte",
    badgeClass:
      "border-purple-500/30 bg-purple-500/10 text-purple-800 dark:border-purple-400/40 dark:bg-purple-500/20 dark:text-purple-200",
    dotClass: "bg-purple-500",
  },
  solo: {
    label: "Solo / Instrumental",
    badgeClass:
      "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-200",
    dotClass: "bg-orange-500",
  },
  outro: {
    label: "Final",
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-200",
    dotClass: "bg-rose-500",
  },
  generic: {
    label: "Seção",
    badgeClass:
      "border-border/80 bg-muted/70 text-foreground dark:border-border dark:bg-muted dark:text-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export function SectionBadge({
  type,
  name,
  className,
}: {
  type: SongSectionType;
  name?: string;
  className?: string;
}) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.generic;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide shadow-2xs select-none",
        config.badgeClass,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      <span>{name || config.label}</span>
    </Badge>
  );
}

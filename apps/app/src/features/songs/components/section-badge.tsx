import type { SongSectionType } from "@/lib/music/chords-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NEUTRAL_BADGE =
  "border-border/80 bg-muted/70 text-foreground dark:border-border dark:bg-muted dark:text-foreground";

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
      "border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-emerald-200",
    dotClass: "bg-primary",
  },
  verse: {
    label: "Verso",
    badgeClass: NEUTRAL_BADGE,
    dotClass: "bg-muted-foreground",
  },
  "pre-chorus": {
    label: "Pré-Refrão",
    badgeClass:
      "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-200",
    dotClass: "bg-amber-500",
  },
  chorus: {
    label: "Refrão",
    badgeClass:
      "border-amber-500/50 bg-amber-500/15 font-semibold text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-200",
    dotClass: "bg-amber-500",
  },
  bridge: {
    label: "Ponte",
    badgeClass: NEUTRAL_BADGE,
    dotClass: "bg-muted-foreground",
  },
  solo: {
    label: "Solo / Instrumental",
    badgeClass: NEUTRAL_BADGE,
    dotClass: "bg-muted-foreground",
  },
  outro: {
    label: "Final",
    badgeClass: NEUTRAL_BADGE,
    dotClass: "bg-muted-foreground",
  },
  generic: {
    label: "Seção",
    badgeClass: NEUTRAL_BADGE,
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
        "gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide select-none",
        config.badgeClass,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)} />
      <span>{name || config.label}</span>
    </Badge>
  );
}

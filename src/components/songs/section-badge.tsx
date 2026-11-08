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
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  verse: {
    label: "Verso",
    badgeClass:
      "border-primary/30 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20 dark:text-primary-foreground",
    dotClass: "bg-primary",
  },
  "pre-chorus": {
    label: "Pré-Refrão",
    badgeClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300",
    dotClass: "bg-sky-500",
  },
  chorus: {
    label: "Refrão",
    badgeClass:
      "border-amber-500/40 bg-amber-500/15 text-amber-800 font-semibold dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300",
    dotClass: "bg-amber-500 animate-pulse",
  },
  bridge: {
    label: "Ponte",
    badgeClass:
      "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300",
    dotClass: "bg-purple-500",
  },
  solo: {
    label: "Solo / Instrumental",
    badgeClass:
      "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-300",
    dotClass: "bg-orange-500",
  },
  outro: {
    label: "Final",
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300",
    dotClass: "bg-rose-500",
  },
  generic: {
    label: "Seção",
    badgeClass: "border-border/80 bg-muted/60 text-muted-foreground",
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

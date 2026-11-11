import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatItem = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
};

export function StatStrip({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="grid grid-cols-3 divide-x divide-border/60 p-0">
        {items.map(({ icon: Icon, label, value, hint }) => (
          <div
            key={label}
            className="flex flex-col gap-2.5 px-3 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-10">
              <Icon className="size-4 sm:size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="font-heading text-2xl leading-none tracking-tight sm:text-3xl tabular-nums">
                {value}
              </p>
              <p className="text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">
                {label}
              </p>
              <p className="hidden text-[11px] leading-tight text-muted-foreground/75 sm:block">
                {hint}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

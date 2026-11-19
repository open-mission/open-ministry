import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Linha genérica de lista da home: conteúdo à esquerda, ação/meta à direita.
 */
export function HomeListItem({
  leading,
  title,
  meta,
  trailing,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60 -mx-2",
        className,
      )}
      {...props}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {meta ? (
          <div className="truncate text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

/**
 * Bloco de data (dia + mês) reutilizado em eventos.
 */
export function HomeDateBadge({
  day,
  month,
  className,
}: {
  day: string;
  month: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-inner",
        className,
      )}
      aria-hidden="true"
    >
      <span className="font-heading text-xl leading-none font-semibold tabular-nums">
        {day}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase">
        {month}
      </span>
    </span>
  );
}

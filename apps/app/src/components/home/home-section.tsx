import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Bloco de conteúdo da home. Mantém o mesmo ritmo vertical em todas as abas.
 */
export function HomeSection({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("flex flex-col gap-3", className)} {...props} />
  );
}

export function HomeSectionHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("flex items-end justify-between gap-3", className)}
      {...props}
    />
  );
}

export function HomeSectionTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn(
        "font-heading text-lg leading-tight font-medium tracking-tight text-foreground sm:text-xl",
        className,
      )}
      {...props}
    />
  );
}

export function HomeSectionDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Slot para a ação do cabeçalho (link "Ver todas", "Gerenciar", etc.).
 */
export function HomeSectionAction({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

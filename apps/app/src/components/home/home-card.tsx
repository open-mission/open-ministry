import type { ComponentPropsWithoutRef } from "react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Casca padrão dos cards da home: mesma borda, raio e sombra em todos os widgets.
 */
export function HomeCard({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Card>) {
  return (
    <Card
      className={cn("border-border/70 shadow-xs", className)}
      {...props}
    />
  );
}

export function HomeCardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CardHeader>) {
  return <CardHeader className={cn("gap-1", className)} {...props} />;
}

export function HomeCardContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CardContent>) {
  return (
    <CardContent className={cn("p-4 sm:p-5", className)} {...props} />
  );
}

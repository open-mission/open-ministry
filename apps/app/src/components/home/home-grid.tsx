import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Grid responsivo da home: coluna única no mobile e duas colunas
 * assimétricas no desktop (7/5), alinhadas ao topo.
 */
export function HomeGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start",
        className,
      )}
      {...props}
    />
  );
}

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Grid responsivo das seções da home: uma coluna no mobile, duas no desktop.
 */
export function HomeGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start",
        className,
      )}
      {...props}
    />
  );
}

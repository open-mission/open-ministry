"use client";

import type { PlatformOrganizationRow } from "@/app/actions/platform";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const STATUS_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Ativa",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  trial: {
    label: "Trial",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  suspended: {
    label: "Suspensa",
    className:
      "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function OrgStatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_MAP[status] ?? {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function OrgWhatsAppBadge({
  whatsapp,
}: {
  whatsapp: PlatformOrganizationRow["whatsapp"];
}) {
  if (whatsapp.connectionStatus === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <span className="size-2 rounded-full bg-emerald-500" />
        Conectado
      </span>
    );
  }
  if (whatsapp.hasInstance) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <span className="size-2 rounded-full bg-amber-500" />
        Aguardando QR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full bg-muted-foreground/40" />
      Sem instância
    </span>
  );
}

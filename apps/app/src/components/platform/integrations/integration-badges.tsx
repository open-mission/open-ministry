"use client";

import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

import type { PlatformIntegrationView } from "@/app/actions/platform";
import { Badge } from "@/components/ui/badge";

import type { HealthFeedback } from "./types";

export function IntegrationSourceBadge({
  source,
}: {
  source: PlatformIntegrationView["source"];
}) {
  if (source === "env") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/35 bg-emerald-500/10 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
      >
        Origem: .env
      </Badge>
    );
  }
  if (source === "platform") {
    return (
      <Badge
        variant="outline"
        className="border-primary/35 bg-primary/10 text-[11px] font-medium text-primary"
      >
        Customizado no painel
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] text-muted-foreground">
      Não configurado
    </Badge>
  );
}

export function IntegrationHealthBadge({
  health,
  isEnabled,
}: {
  health: HealthFeedback;
  isEnabled: boolean;
}) {
  if (!isEnabled) {
    return (
      <Badge variant="outline" className="text-[11px] text-muted-foreground">
        Desativada
      </Badge>
    );
  }
  if (!health) {
    return (
      <Badge variant="outline" className="text-[11px]">
        Não testada
      </Badge>
    );
  }
  if (health.ok) {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-[11px] text-emerald-700 dark:text-emerald-300">
        <CheckCircle2Icon className="size-3.5" />
        Online{health.latencyMs != null ? ` · ${health.latencyMs}ms` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1 text-[11px]">
      <AlertTriangleIcon className="size-3.5" />
      Falha no teste
    </Badge>
  );
}

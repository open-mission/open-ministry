"use client";

import {
  ActivityIcon,
  Loader2Icon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";

import type { PlatformIntegrationView } from "@/app/actions/platform";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { HealthFeedback } from "./types";

export function IntegrationHealthFooter({
  integration,
  health,
  testLabel,
  canTest,
  isTesting,
  isSaving,
  isResetting,
  onTest,
  onRequestReset,
}: {
  integration: PlatformIntegrationView;
  health: HealthFeedback;
  testLabel: string;
  canTest: boolean;
  isTesting: boolean;
  isSaving: boolean;
  isResetting: boolean;
  onTest: () => void;
  onRequestReset: () => void;
}) {
  const showResetButton =
    integration.source === "platform" && integration.hasEnvFallback;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        health?.ok
          ? "border-emerald-500/25 bg-emerald-500/5"
          : health && !health.ok
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-muted/30",
      )}
    >
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ActivityIcon className="size-4 text-primary" />
          <span>Monitoramento de Saúde</span>
        </div>
        <p className="text-muted-foreground">
          {integration.lastHealthCheckedAt
            ? `Última verificação: ${formatDateTime(integration.lastHealthCheckedAt)}`
            : "Nenhuma verificação registrada ainda."}
          {health?.instanceCount !== undefined
            ? ` · ${health.instanceCount} instâncias no servidor`
            : ""}
        </p>
        {health?.error ? (
          <p className="font-medium text-destructive">{health.error}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showResetButton ? (
          <Button
            type="button"
            variant="ghost"
            disabled={isResetting || isSaving || isTesting}
            onClick={onRequestReset}
            className="min-h-11 gap-2 sm:min-h-9"
          >
            <RotateCcwIcon className="size-4" />
            Usar padrão do .env
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={isTesting || !canTest}
          onClick={onTest}
          className="min-h-11 gap-2 sm:min-h-9"
        >
          {isTesting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ActivityIcon className="size-4" />
          )}
          {testLabel}
        </Button>

        <Button
          type="submit"
          disabled={isSaving}
          className="min-h-11 gap-2 sm:min-h-9"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          Salvar integração
        </Button>
      </div>
    </div>
  );
}

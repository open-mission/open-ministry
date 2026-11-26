"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2Icon,
  MessageSquareIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";

import {
  listPlatformIntegrationsAction,
  resetPlatformIntegrationToEnvAction,
  type PlatformIntegrationView,
} from "@/app/actions/platform";
import { PlatformConfirmDialog } from "@/components/platform/platform-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { BrevoIntegrationCard } from "./integrations/brevo-integration-card";
import { EvolutionIntegrationCard } from "./integrations/evolution-integration-card";
import {
  emptyIntegration,
  type PlatformIntegrationsViewProps,
  type ResetTarget,
} from "./integrations/types";
import { WebPushIntegrationCard } from "./integrations/web-push-integration-card";

export function PlatformIntegrationsView({
  initialIntegrations,
}: PlatformIntegrationsViewProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [isRefreshing, startRefreshing] = useTransition();
  const [isResetting, startResetting] = useTransition();

  function getIntegration(
    provider: string,
    fallbackName: string,
  ): PlatformIntegrationView {
    return (
      integrations.find((item) => item.provider === provider) ??
      emptyIntegration(provider, fallbackName)
    );
  }

  const evolution = getIntegration(
    "evolution_whatsapp",
    "Evolution API Go (Evogo)",
  );
  const brevo = getIntegration("brevo_email", "Brevo (E-mail)");
  const webPush = getIntegration("web_push", "Web Push (VAPID / OneSignal)");
  const metaCloud = getIntegration(
    "meta_whatsapp_cloud",
    "WhatsApp Oficial (Meta Cloud)",
  );

  async function refreshIntegrations() {
    try {
      const next = await listPlatformIntegrationsAction();
      setIntegrations(next);
    } catch {
      // mantém estado local se atualização falhar
    }
  }

  function handleConfirmReset() {
    if (!resetTarget) return;
    const target = resetTarget;
    startResetting(async () => {
      const res = await resetPlatformIntegrationToEnvAction(target.provider);
      if (!res.ok) {
        toast.error(res.error || "Não foi possível restaurar o padrão do .env.");
        return;
      }
      setResetTarget(null);
      await refreshIntegrations();
      toast.success(`${target.displayName} restaurado para o padrão do .env.`);
    });
  }

  function cardKey(item: PlatformIntegrationView): string {
    return `${item.provider}:${item.source}:${item.isEnabled}:${JSON.stringify(item.config)}:${item.maskedSecret ?? ""}:${JSON.stringify(item.secretMasks ?? {})}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Integrações da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            Variáveis de ambiente (`.env`) atuam como fonte primária e podem ser
            customizadas ou restauradas a qualquer momento pelo painel.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isRefreshing}
          onClick={() => startRefreshing(() => void refreshIntegrations())}
          className="min-h-11 gap-2 sm:min-h-9"
        >
          {isRefreshing ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          Atualizar status
        </Button>
      </header>

      <EvolutionIntegrationCard
        key={cardKey(evolution)}
        integration={evolution}
        onRefresh={refreshIntegrations}
        onRequestReset={() =>
          setResetTarget({
            provider: "evolution_whatsapp",
            displayName: evolution.displayName,
          })
        }
        isResetting={isResetting}
      />

      <BrevoIntegrationCard
        key={cardKey(brevo)}
        integration={brevo}
        onRefresh={refreshIntegrations}
        onRequestReset={() =>
          setResetTarget({
            provider: "brevo_email",
            displayName: brevo.displayName,
          })
        }
        isResetting={isResetting}
      />

      <WebPushIntegrationCard
        key={cardKey(webPush)}
        integration={webPush}
        onRefresh={refreshIntegrations}
        onRequestReset={() =>
          setResetTarget({
            provider: "web_push",
            displayName: webPush.displayName,
          })
        }
        isResetting={isResetting}
      />

      {/* Future / Extensible Slot: Meta Cloud API */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Expansão futura da plataforma
          </h2>
          <Link
            href="/platform/operators"
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver auditoria de alterações
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <MessageSquareIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    WhatsApp Oficial (Meta Cloud API)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Canal oficial com templates aprovados e cobrança por
                    conversa pela Meta.
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={metaCloud.isEnabled ? "secondary" : "outline"}
                className="gap-1 text-[11px]"
              >
                <SparklesIcon className="size-3" />
                {metaCloud.isEnabled ? "Configurado" : "Em breve"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Estrutura preparada em `platform_integration_config` para ativação
            centralizada sem expor credenciais às igrejas.
          </CardContent>
        </Card>
      </section>

      <PlatformConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        title="Usar padrão do .env?"
        description={
          resetTarget ? (
            <>
              As customizações salvas no painel para{" "}
              <strong>{resetTarget.displayName}</strong> serão removidas, o
              provedor será reativado e passará a ler as variáveis de ambiente (
              <code>.env</code>).
            </>
          ) : null
        }
        confirmLabel="Confirmar restauração"
        variant="default"
        pending={isResetting}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}

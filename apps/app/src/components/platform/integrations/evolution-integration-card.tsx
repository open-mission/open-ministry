"use client";

import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { ServerIcon } from "lucide-react";

import {
  saveEvolutionPlatformIntegrationAction,
  testEvolutionPlatformIntegrationAction,
} from "@/app/actions/platform";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { IntegrationCardHeader } from "./integration-card-header";
import { IntegrationHealthFooter } from "./integration-health-footer";
import { SecretFieldInput } from "./secret-field-input";
import { readStringConfig, type IntegrationCardProps } from "./types";
import { useIntegrationHealth } from "./use-integration-health";

export function EvolutionIntegrationCard({
  integration,
  onRefresh,
  onRequestReset,
  isResetting,
}: IntegrationCardProps) {
  const [apiUrl, setApiUrl] = useState(readStringConfig(integration, "apiUrl"));
  const [globalApiKey, setGlobalApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(
    integration.source === "unconfigured" ? true : integration.isEnabled,
  );

  const [isSaving, startSaving] = useTransition();
  const { health, isTesting, applyHealth, runTest } = useIntegrationHealth(
    integration,
    onRefresh,
  );

  const keyMask =
    integration.secretMasks?.globalApiKey ?? integration.maskedSecret ?? null;
  const hasSecret = Boolean(integration.hasSecret || keyMask);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!apiUrl.trim()) {
      toast.error("Informe a URL base do servidor Evolution API Go.");
      return;
    }
    if (!hasSecret && !globalApiKey.trim()) {
      toast.error("Informe a Global API Key da Evolution.");
      return;
    }

    startSaving(async () => {
      const res = await saveEvolutionPlatformIntegrationAction({
        apiUrl: apiUrl.trim(),
        globalApiKey: globalApiKey.trim() || undefined,
        isEnabled,
      });
      if (!res.ok) {
        toast.error(res.error || "Não foi possível salvar a integração.");
        return;
      }

      setGlobalApiKey("");
      if (res.health) {
        applyHealth({ ok: res.health.ok, latencyMs: res.health.latencyMs });
      }
      await onRefresh();
      toast.success("Configuração global da Evolution Go salva!");
    });
  }

  function handleTest() {
    runTest({
      action: testEvolutionPlatformIntegrationAction,
      successMessage: (res) =>
        `Conexão OK (${res.latencyMs ?? 0}ms · ${res.instanceCount ?? 0} instâncias ativas).`,
      fallbackError: "Falha ao testar servidor Evolution Go.",
    });
  }

  return (
    <Card>
      <IntegrationCardHeader
        icon={<ServerIcon className="size-5" />}
        title="Evolution API Go (Evogo)"
        description="Servidor compartilhado que provisiona automaticamente a instância e o QR Code de cada igreja habilitada."
        integration={integration}
        health={health}
        isEnabled={isEnabled}
        onEnabledChange={setIsEnabled}
        switchId="evo-global-enabled"
      />

      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform-evo-api-url">
                URL base do servidor (apiUrl) *
              </Label>
              <Input
                id="platform-evo-api-url"
                type="url"
                placeholder="https://evo.openministry.app"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                required
                className="min-h-11 font-mono text-xs sm:min-h-9 sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Endereço HTTPS do cluster Evolution Go sem barra final (`.env`: `EVOLUTION_API_URL`).
              </p>
            </div>

            <SecretFieldInput
              id="platform-evo-global-key"
              label="Global API Key"
              value={globalApiKey}
              onChange={setGlobalApiKey}
              mask={keyMask}
              source={integration.source}
              required
              placeholderWithMask="Deixe em branco para manter a chave atual"
              placeholderEmpty="Cole a Global API Key do servidor"
              helperText="Criptografada com AES-256-GCM no banco; nunca exposta às igrejas."
              toggleAriaLabel="Global API Key"
            />
          </div>

          <IntegrationHealthFooter
            integration={integration}
            health={health}
            testLabel="Testar conexão"
            canTest={hasSecret && integration.source !== "unconfigured"}
            isTesting={isTesting}
            isSaving={isSaving}
            isResetting={isResetting}
            onTest={handleTest}
            onRequestReset={onRequestReset}
          />
        </form>
      </CardContent>
    </Card>
  );
}

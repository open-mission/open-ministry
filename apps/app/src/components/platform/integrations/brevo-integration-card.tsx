"use client";

import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";

import {
  saveBrevoPlatformIntegrationAction,
  testBrevoPlatformIntegrationAction,
} from "@/app/actions/platform";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { IntegrationCardHeader } from "./integration-card-header";
import { IntegrationHealthFooter } from "./integration-health-footer";
import { SecretFieldInput } from "./secret-field-input";
import { readStringConfig, type IntegrationCardProps } from "./types";
import { useIntegrationHealth } from "./use-integration-health";

export function BrevoIntegrationCard({
  integration,
  onRefresh,
  onRequestReset,
  isResetting,
}: IntegrationCardProps) {
  const [senderEmail, setSenderEmail] = useState(
    readStringConfig(integration, "senderEmail", "notificacoes@openministry.app"),
  );
  const [senderName, setSenderName] = useState(
    readStringConfig(integration, "senderName", "OpenMinistry"),
  );
  const [apiKey, setApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(
    integration.source === "unconfigured" ? true : integration.isEnabled,
  );

  const [isSaving, startSaving] = useTransition();
  const { health, isTesting, runTest } = useIntegrationHealth(
    integration,
    onRefresh,
  );

  const keyMask =
    integration.secretMasks?.apiKey ?? integration.maskedSecret ?? null;
  const hasSecret = Boolean(integration.hasSecret || keyMask);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!senderEmail.trim() || !senderName.trim()) {
      toast.error("Informe o e-mail e o nome de remetente do Brevo.");
      return;
    }
    if (!hasSecret && !apiKey.trim()) {
      toast.error("Informe a API Key do Brevo.");
      return;
    }

    startSaving(async () => {
      const res = await saveBrevoPlatformIntegrationAction({
        senderEmail: senderEmail.trim(),
        senderName: senderName.trim(),
        apiKey: apiKey.trim() || undefined,
        isEnabled,
      });
      if (!res.ok) {
        toast.error(res.error || "Não foi possível salvar o Brevo.");
        return;
      }

      setApiKey("");
      await onRefresh();
      toast.success("Configuração global do Brevo salva!");
    });
  }

  function handleTest() {
    runTest({
      action: testBrevoPlatformIntegrationAction,
      successMessage: (res) => `Brevo conectado (${res.latencyMs ?? 0}ms).`,
      fallbackError: "Falha ao testar conta Brevo.",
    });
  }

  return (
    <Card>
      <IntegrationCardHeader
        icon={<MailIcon className="size-5" />}
        title="Brevo — E-mail Transacional"
        description="Disparo global de convites, verificação de conta, redefinição de senha e avisos por e-mail."
        integration={integration}
        health={health}
        isEnabled={isEnabled}
        onEnabledChange={setIsEnabled}
        switchId="brevo-global-enabled"
      />

      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="platform-brevo-sender-email">
                E-mail remetente *
              </Label>
              <Input
                id="platform-brevo-sender-email"
                type="email"
                placeholder="notificacoes@openministry.app"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                required
                className="min-h-11 text-xs sm:min-h-9 sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Padrão do `.env`: `BREVO_SENDER_EMAIL` ou `EMAIL_FROM`.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform-brevo-sender-name">
                Nome do remetente *
              </Label>
              <Input
                id="platform-brevo-sender-name"
                type="text"
                placeholder="OpenMinistry"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
                className="min-h-11 text-xs sm:min-h-9 sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Exibido aos destinatários dos e-mails (`BREVO_SENDER_NAME`).
              </p>
            </div>

            <SecretFieldInput
              id="platform-brevo-api-key"
              label="API Key do Brevo"
              value={apiKey}
              onChange={setApiKey}
              mask={keyMask}
              source={integration.source}
              required
              placeholderWithMask="Deixe em branco para manter a chave atual"
              placeholderEmpty="xkeysib-..."
              helperText="Chave `BREVO_API_KEY`; salva cifrada fora do acesso das igrejas."
              toggleAriaLabel="API Key do Brevo"
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

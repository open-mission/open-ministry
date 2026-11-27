"use client";

import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { BellRingIcon } from "lucide-react";

import {
  saveWebPushPlatformIntegrationAction,
  testWebPushPlatformIntegrationAction,
} from "@/app/actions/platform";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { IntegrationCardHeader } from "./integration-card-header";
import { IntegrationHealthFooter } from "./integration-health-footer";
import { SecretFieldInput } from "./secret-field-input";
import { readStringConfig, type IntegrationCardProps } from "./types";
import { useIntegrationHealth } from "./use-integration-health";

export function WebPushIntegrationCard({
  integration,
  onRefresh,
  onRequestReset,
  isResetting,
}: IntegrationCardProps) {
  const [vapidPublicKey, setVapidPublicKey] = useState(
    readStringConfig(integration, "vapidPublicKey"),
  );
  const [vapidPrivateKey, setVapidPrivateKey] = useState("");
  const [vapidSubject, setVapidSubject] = useState(
    readStringConfig(integration, "vapidSubject", "mailto:suporte@openministry.app"),
  );
  const [oneSignalAppId, setOneSignalAppId] = useState(
    readStringConfig(integration, "oneSignalAppId"),
  );
  const [oneSignalRestApiKey, setOneSignalRestApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(
    integration.source === "unconfigured" ? true : integration.isEnabled,
  );

  const [isSaving, startSaving] = useTransition();
  const { health, isTesting, runTest } = useIntegrationHealth(
    integration,
    onRefresh,
  );

  const vapidPrivateMask = integration.secretMasks?.vapidPrivateKey ?? null;
  const oneSignalKeyMask =
    integration.secretMasks?.oneSignalRestApiKey ?? null;
  const hasVapidSecret = Boolean(vapidPrivateMask || integration.hasSecret);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!vapidPublicKey.trim()) {
      toast.error("Informe a chave pública VAPID.");
      return;
    }
    if (!hasVapidSecret && !vapidPrivateKey.trim()) {
      toast.error("Informe a chave privada VAPID.");
      return;
    }

    startSaving(async () => {
      const res = await saveWebPushPlatformIntegrationAction({
        vapidPublicKey: vapidPublicKey.trim(),
        vapidPrivateKey: vapidPrivateKey.trim() || undefined,
        vapidSubject: vapidSubject.trim() || "mailto:suporte@openministry.app",
        oneSignalAppId: oneSignalAppId.trim() || undefined,
        oneSignalRestApiKey: oneSignalRestApiKey.trim() || undefined,
        isEnabled,
      });
      if (!res.ok) {
        toast.error(
          res.error || "Não foi possível salvar a configuração de Web Push.",
        );
        return;
      }

      setVapidPrivateKey("");
      setOneSignalRestApiKey("");
      await onRefresh();
      toast.success("Configuração global de Web Push salva!");
    });
  }

  function handleTest() {
    runTest({
      action: testWebPushPlatformIntegrationAction,
      successMessage: (res) => `Web Push válido (${res.latencyMs ?? 0}ms).`,
      fallbackError: "Configuração de Web Push inválida.",
    });
  }

  return (
    <Card>
      <IntegrationCardHeader
        icon={<BellRingIcon className="size-5" />}
        title="Web Push — Notificações Push (VAPID Nativo + OneSignal)"
        description="Chaves VAPID compartilhadas da plataforma para push no navegador/PWA e integração opcional com OneSignal."
        integration={integration}
        health={health}
        isEnabled={isEnabled}
        onEnabledChange={setIsEnabled}
        switchId="web-push-global-enabled"
      />

      <CardContent className="space-y-6 pt-6">
        <form onSubmit={handleSave} className="space-y-5">
          {/* VAPID Native */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              VAPID Nativo (PWA / Navegadores)
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platform-vapid-public">
                  Chave pública VAPID *
                </Label>
                <Input
                  id="platform-vapid-public"
                  type="text"
                  placeholder="BEl62i..."
                  value={vapidPublicKey}
                  onChange={(e) => setVapidPublicKey(e.target.value)}
                  required
                  className="min-h-11 font-mono text-xs sm:min-h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Variável `.env`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
                </p>
              </div>

              <SecretFieldInput
                id="platform-vapid-private"
                label="Chave privada VAPID"
                value={vapidPrivateKey}
                onChange={setVapidPrivateKey}
                mask={vapidPrivateMask}
                source={integration.source}
                required
                placeholderWithMask="Deixe em branco para manter a chave privada"
                placeholderEmpty="Cole a VAPID_PRIVATE_KEY"
                helperText="Mantida cifrada no servidor; nunca enviada ao navegador."
                toggleAriaLabel="chave privada VAPID"
              />
            </div>

            <div className="space-y-2 md:max-w-md">
              <Label htmlFor="platform-vapid-subject">
                Assunto / contato VAPID
              </Label>
              <Input
                id="platform-vapid-subject"
                type="text"
                placeholder="mailto:suporte@openministry.app"
                value={vapidSubject}
                onChange={(e) => setVapidSubject(e.target.value)}
                className="min-h-11 font-mono text-xs sm:min-h-9"
              />
            </div>
          </div>

          {/* OneSignal Optional */}
          <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                OneSignal (opcional)
              </h3>
              <p className="text-xs text-muted-foreground">
                Preencha apenas se desejar disparo paralelo pelo OneSignal além
                do Web Push nativo.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platform-onesignal-app-id">
                  OneSignal App ID (opcional)
                </Label>
                <Input
                  id="platform-onesignal-app-id"
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={oneSignalAppId}
                  onChange={(e) => setOneSignalAppId(e.target.value)}
                  className="min-h-11 font-mono text-xs sm:min-h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Variável `.env`: `NEXT_PUBLIC_ONESIGNAL_APP_ID`.
                </p>
              </div>

              <SecretFieldInput
                id="platform-onesignal-rest-key"
                label="OneSignal REST API Key"
                value={oneSignalRestApiKey}
                onChange={setOneSignalRestApiKey}
                mask={oneSignalKeyMask}
                source={integration.source}
                placeholderWithMask="Deixe em branco para manter a chave atual"
                placeholderEmpty="Cole a ONESIGNAL_REST_API_KEY"
                helperText="Opcional; validada ao testar quando o App ID estiver informado."
                toggleAriaLabel="REST API Key do OneSignal"
              />
            </div>
          </div>

          <IntegrationHealthFooter
            integration={integration}
            health={health}
            testLabel="Testar configuração"
            canTest={hasVapidSecret && integration.source !== "unconfigured"}
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

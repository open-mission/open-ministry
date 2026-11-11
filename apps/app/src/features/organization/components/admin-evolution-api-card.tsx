"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  RadioIcon,
  SendIcon,
  ServerIcon,
  WebhookIcon,
  WifiIcon,
  XCircleIcon,
} from "lucide-react";

import {
  configureEvolutionWebhookAction,
  saveEvolutionSettingsAction,
  sendTestEvolutionMessageAction,
  testEvolutionConnectionAction,
  type EvolutionSettingsFormState,
  type EvolutionSettingsView,
} from "@/app/actions/settings";
import { copyToClipboard } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type AdminEvolutionApiCardProps = {
  initialSettings: EvolutionSettingsView;
};

export function AdminEvolutionApiCard({
  initialSettings,
}: AdminEvolutionApiCardProps) {
  const [isActive, setIsActive] = useState(initialSettings.isActive);
  const [apiUrl, setApiUrl] = useState(initialSettings.apiUrl);
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);
  const [instanceName, setInstanceName] = useState(
    initialSettings.instanceName,
  );

  // Connection testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    ok: boolean;
    state?: string;
    error?: string;
    details?: {
      instanceName?: string;
      whatsappName?: string;
      phoneJid?: string;
      authType?: "global" | "instance";
    };
  } | null>(null);

  // Test message state
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, startSendingTest] = useTransition();
  const [isConfiguringWebhook, startConfiguringWebhook] = useTransition();

  function handleConfigureWebhook() {
    startConfiguringWebhook(async () => {
      const res = await configureEvolutionWebhookAction();
      if (res.ok) {
        toast.success(
          "Webhook registrado com sucesso no seu servidor Evolution GO!",
        );
      } else {
        toast.error(
          res.error || "Não foi possível registrar o webhook automaticamente.",
        );
      }
    });
  }

  function handleCopyWebhookUrl() {
    if (initialSettings.webhookUrl) {
      copyToClipboard(initialSettings.webhookUrl);
      toast.success("URL do webhook copiada para a área de transferência!");
    }
  }

  const [state, formAction, isSaving] = useActionState<
    EvolutionSettingsFormState,
    FormData
  >(async (prevState, formData) => {
    formData.set("isActive", String(isActive));
    const res = await saveEvolutionSettingsAction(prevState, formData);
    if (res?.success) {
      toast.success("Configurações da Evolution API salvas com sucesso!");
    } else if (res?.error) {
      toast.error(res.error);
    }
    return res;
  }, undefined);

  async function handleTestConnection() {
    if (!apiUrl.trim() || !apiKey.trim() || !instanceName.trim()) {
      toast.error("Preencha a URL, chave de API e nome da instância para testar.");
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    const res = await testEvolutionConnectionAction(
      apiUrl.trim(),
      apiKey.trim(),
      instanceName.trim(),
    );

    setConnectionStatus({
      tested: true,
      ok: res.ok,
      state: res.state,
      error: res.error,
      details: res.details,
    });

    if (res.ok) {
      toast.success(
        `Conexão estabelecida com sucesso! Estado da instância: ${res.state || "conectado"}.`,
      );
    } else {
      toast.error(res.error || "Não foi possível conectar à Evolution API.");
    }

    setTestingConnection(false);
  }

  function handleSendTestMessage() {
    if (!testPhone.trim()) {
      toast.error("Informe um número de telefone com DDD para testar o envio.");
      return;
    }

    startSendingTest(async () => {
      const res = await sendTestEvolutionMessageAction(testPhone.trim());
      if (res.ok) {
        toast.success("Mensagem de teste enviada com sucesso no WhatsApp!");
      } else {
        toast.error(res.error || "Erro ao enviar mensagem de teste.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <MessageSquareIcon className="size-4" />
              </div>
              <CardTitle className="font-heading text-xl tracking-tight">
                WhatsApp (Evolution API Go)
              </CardTitle>
            </div>
            <CardDescription>
              Conecte a instância da Evolution API da sua igreja para notificar
              membros quando forem escalados, avisos e lembretes no WhatsApp.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <span className="text-xs font-medium text-muted-foreground">
              Canal ativo
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Ativar canal do WhatsApp"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form action={formAction} className="space-y-6">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field
              data-invalid={Boolean(state?.fieldErrors?.apiUrl)}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="apiUrl">URL da Evolution API Go *</FieldLabel>
              <Input
                id="apiUrl"
                name="apiUrl"
                placeholder="https://api.evolution.sua-igreja.com.br"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setConnectionStatus(null);
                }}
                required
                className="h-10 font-mono text-xs sm:text-sm"
                aria-invalid={Boolean(state?.fieldErrors?.apiUrl)}
              />
              <FieldDescription>
                Endereço base do seu servidor Evolution API Go sem barra no final.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.apiUrl?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field data-invalid={Boolean(state?.fieldErrors?.apiKey)}>
              <FieldLabel htmlFor="apiKey">Chave de API (apikey) *</FieldLabel>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Ex.: 4296084a-38bb-4b68-b807-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setConnectionStatus(null);
                }}
                required
                className="h-10 font-mono text-xs"
                aria-invalid={Boolean(state?.fieldErrors?.apiKey)}
              />
              <FieldDescription>
                Aceita tanto a <strong>Global API Key</strong> quanto o <strong>Token da Instância</strong>. O sistema identifica e resolve o token da instância automaticamente no Evolution Go.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.apiKey?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field data-invalid={Boolean(state?.fieldErrors?.instanceName)}>
              <FieldLabel htmlFor="instanceName">Nome da Instância *</FieldLabel>
              <Input
                id="instanceName"
                name="instanceName"
                placeholder="Ex.: claudio ou igreja-sede"
                value={instanceName}
                onChange={(e) => {
                  setInstanceName(e.target.value);
                  setConnectionStatus(null);
                }}
                required
                className="h-10 font-mono text-xs"
                aria-invalid={Boolean(state?.fieldErrors?.instanceName)}
              />
              <FieldDescription>
                Nome exato da instância cadastrada no seu servidor Evolution Go.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.instanceName?.map((m) => ({
                  message: m,
                }))}
              />
            </Field>
          </FieldGroup>

          {/* Test connection row */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3.5">
              <div className="flex items-center gap-2">
                <ServerIcon className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Status da Conexão:
                </span>
                {connectionStatus ? (
                  connectionStatus.ok ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 gap-1 font-mono text-xs font-normal">
                      <CheckCircle2Icon className="size-3.5" />
                      Online ({connectionStatus.state || "conectado"})
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 font-mono text-xs font-normal">
                      <XCircleIcon className="size-3.5" />
                      Falha na conexão
                    </Badge>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Não testada recentemente
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testingConnection}
                onClick={handleTestConnection}
                className="gap-1.5 h-8"
              >
                {testingConnection ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <WifiIcon className="size-3.5" />
                )}
                Testar conexão
              </Button>
            </div>

            {/* Connection Details Feedback */}
            {connectionStatus?.ok && connectionStatus.details && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  {connectionStatus.details.authType === "global"
                    ? "Chave Global (Global API Key) validada com sucesso — Token da instância vinculado automaticamente!"
                    : "Token da Instância validado com sucesso!"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground pt-0.5">
                  {connectionStatus.details.whatsappName ? (
                    <span>
                      Nome WhatsApp:{" "}
                      <strong className="text-foreground">
                        {connectionStatus.details.whatsappName}
                      </strong>
                    </span>
                  ) : null}
                  {connectionStatus.details.phoneJid ? (
                    <span>
                      Número:{" "}
                      <strong className="text-foreground">
                        +{connectionStatus.details.phoneJid.split(":")[0]}
                      </strong>
                    </span>
                  ) : null}
                  {connectionStatus.details.instanceName ? (
                    <span>
                      Instância:{" "}
                      <strong className="text-foreground">
                        {connectionStatus.details.instanceName}
                      </strong>
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {connectionStatus && !connectionStatus.ok && connectionStatus.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive">
                <p className="font-semibold">Erro ao conectar:</p>
                <p className="text-muted-foreground mt-0.5">{connectionStatus.error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Salvar configurações
            </Button>
          </div>
        </form>

        {/* Test sending message section */}
        <div className="border-t pt-5 space-y-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">
              Enviar mensagem de teste
            </h4>
            <p className="text-xs text-muted-foreground">
              Envie um WhatsApp de teste para o seu próprio número para certificar
              que a entrega está 100% operacional.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="tel"
              placeholder="Ex.: (11) 99999-8888"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="h-9 max-w-xs text-xs font-mono"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSendingTest || !testPhone.trim()}
              onClick={handleSendTestMessage}
              className="gap-1.5 h-9"
            >
              {isSendingTest ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SendIcon className="size-3.5" />
              )}
              Enviar teste agora
            </Button>
          </div>
        </div>

        {/* Webhook Configuration for Evolution GO */}
        <div className="border-t pt-5 space-y-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <WebhookIcon className="size-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Webhook do Evolution GO (Confirmação de Entrega e Leitura)
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Receba notificações em tempo real quando as mensagens forem enviadas,
              entregues ou lidas pelos membros no WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="webhookUrl">
              URL do Webhook do OpenMinistry
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="webhookUrl"
                readOnly
                value={initialSettings.webhookUrl || ""}
                className="h-9 font-mono text-xs bg-muted/30"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyWebhookUrl}
                disabled={!initialSettings.webhookUrl}
                className="gap-1.5 h-9 shrink-0"
              >
                <CopyIcon className="size-3.5" />
                Copiar URL
              </Button>
            </div>
            <FieldDescription>
              Cole esta URL nas configurações da sua instância no Evolution Go ou
              utilize o botão abaixo para configurar automaticamente.
            </FieldDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={
                isConfiguringWebhook ||
                !initialSettings.apiUrl ||
                !initialSettings.apiKey
              }
              onClick={handleConfigureWebhook}
              className="gap-1.5 h-8 text-xs"
            >
              {isConfiguringWebhook ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <RadioIcon className="size-3.5" />
              )}
              Configurar Webhook no Evolution GO Automaticamente
            </Button>

            <a
              href="https://docs.evolutionfoundation.com.br/evolution-go/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              Manual de Webhooks do Evolution Go
              <ExternalLinkIcon className="size-3" />
            </a>
          </div>
        </div>

        {/* Helpful docs link and Upstash Queue Info */}
        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Documentação da Evolution API Go: instâncias, QR Code e Webhooks.
          </span>
          <a
            href="https://docs.evolutionfoundation.com.br/evolution-go/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            Abrir documentação oficial
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>

    {/* Link to Dedicated WhatsApp Messages Page */}
    <div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <MessageSquareIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          Histórico de Mensagens do WhatsApp
        </h4>
        <p className="text-xs text-muted-foreground">
          O monitoramento de mensagens, status de entrega e reenvio de falhas agora possui uma página dedicada no menu lateral.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0 h-8 text-xs">
        <Link href="/dashboard/whatsapp">
          <span>Abrir mensagens</span>
          <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
        </Link>
      </Button>
    </div>
  </div>
  );
}

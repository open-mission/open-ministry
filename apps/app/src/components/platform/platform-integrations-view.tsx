"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  MailIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  SaveIcon,
  ServerIcon,
  SparklesIcon,
  SmartphoneIcon,
} from "lucide-react";

import {
  listPlatformIntegrationsAction,
  saveEvolutionPlatformIntegrationAction,
  testEvolutionPlatformIntegrationAction,
  type PlatformIntegrationView,
} from "@/app/actions/platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type PlatformIntegrationsViewProps = {
  initialIntegrations: PlatformIntegrationView[];
};

const SECONDARY_PROVIDERS = [
  {
    provider: "meta_whatsapp_cloud",
    title: "WhatsApp Oficial (Meta Cloud API)",
    description:
      "Canal oficial com templates aprovados e cobrança por conversa pela Meta.",
    icon: MessageSquareIcon,
  },
  {
    provider: "brevo_email",
    title: "Brevo E-mail Transacional",
    description:
      "Disparo global de convites, recuperação de senha e avisos por e-mail.",
    icon: MailIcon,
  },
  {
    provider: "web_push",
    title: "Web Push (Notificações Nativas)",
    description:
      "Chaves VAPID compartilhadas da plataforma para push no navegador e PWA.",
    icon: SmartphoneIcon,
  },
] as const;

export function PlatformIntegrationsView({
  initialIntegrations,
}: PlatformIntegrationsViewProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const evolution = integrations.find(
    (item) => item.provider === "evolution_whatsapp",
  );

  const initialApiUrl =
    typeof evolution?.config?.apiUrl === "string" ? evolution.config.apiUrl : "";

  const [apiUrl, setApiUrl] = useState(initialApiUrl);
  const [globalApiKey, setGlobalApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isEnabled, setIsEnabled] = useState(evolution?.isEnabled ?? true);
  const [hasSavedSecret, setHasSavedSecret] = useState(
    Boolean(evolution?.hasSecret),
  );
  const [maskedSecret, setMaskedSecret] = useState<string | null>(
    evolution?.maskedSecret ?? null,
  );
  const [lastTestInfo, setLastTestInfo] = useState<{
    ok: boolean;
    latencyMs: number | null;
    instanceCount?: number;
    error?: string | null;
  } | null>(
    evolution?.lastHealthStatus
      ? {
          ok: evolution.lastHealthStatus === "healthy",
          latencyMs: evolution.lastHealthLatencyMs,
          error: evolution.lastHealthError,
        }
      : null,
  );

  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();

  async function refreshIntegrations() {
    try {
      const next = await listPlatformIntegrationsAction();
      setIntegrations(next);
      const nextEvo = next.find((item) => item.provider === "evolution_whatsapp");
      if (nextEvo) {
        setHasSavedSecret(nextEvo.hasSecret);
        setMaskedSecret(nextEvo.maskedSecret);
        setIsEnabled(nextEvo.isEnabled);
        if (typeof nextEvo.config?.apiUrl === "string") {
          setApiUrl(nextEvo.config.apiUrl);
        }
        if (nextEvo.lastHealthStatus) {
          setLastTestInfo({
            ok: nextEvo.lastHealthStatus === "healthy",
            latencyMs: nextEvo.lastHealthLatencyMs,
            error: nextEvo.lastHealthError,
          });
        }
      }
    } catch {
      // mantém estado local se atualização falhar
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiUrl.trim()) {
      toast.error("Informe a URL base do servidor Evolution API Go.");
      return;
    }
    if (!hasSavedSecret && !globalApiKey.trim()) {
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
        setLastTestInfo({
          ok: res.health.ok,
          latencyMs: res.health.latencyMs,
        });
      }
      await refreshIntegrations();
      toast.success("Configuração global da Evolution Go salva!");
    });
  }

  function handleTestConnection() {
    startTesting(async () => {
      const res = await testEvolutionPlatformIntegrationAction();
      setLastTestInfo({
        ok: res.ok,
        latencyMs: res.latencyMs,
        instanceCount: res.instanceCount,
        error: res.error,
      });
      await refreshIntegrations();
      if (res.ok) {
        toast.success(
          `Conexão OK (${res.latencyMs ?? 0}ms · ${res.instanceCount} instâncias ativas).`,
        );
      } else {
        toast.error(res.error || "Falha ao testar servidor Evolution Go.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Integrações da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            Credenciais globais gerenciadas exclusivamente pela operação. Nenhuma
            igreja vê URL de servidor ou Global API Key.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshIntegrations()}
          className="min-h-11 gap-2 sm:min-h-9"
        >
          <RefreshCwIcon className="size-4" />
          Atualizar status
        </Button>
      </header>

      {/* Primary Provider: Evolution Go */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ServerIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-heading text-xl tracking-tight">
                    Evolution API Go (Evogo)
                  </CardTitle>
                  {lastTestInfo ? (
                    lastTestInfo.ok ? (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2Icon className="size-3.5" />
                        Online
                        {lastTestInfo.latencyMs != null
                          ? ` · ${lastTestInfo.latencyMs}ms`
                          : ""}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangleIcon className="size-3.5" />
                        Falha no teste
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">Não testada</Badge>
                  )}
                </div>
                <CardDescription>
                  Servidor compartilhado que provisiona automaticamente a instância
                  e o QR Code de cada igreja habilitada.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start rounded-lg border border-border/70 bg-muted/30 px-3 py-2 sm:self-center">
              <Label
                htmlFor="evo-global-enabled"
                className="text-xs font-medium text-foreground cursor-pointer"
              >
                Provedor habilitado
              </Label>
              <Switch
                id="evo-global-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>
          </div>
        </CardHeader>

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
                  Endereço HTTPS do cluster Evolution Go sem barra final.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="platform-evo-global-key">
                    Global API Key {hasSavedSecret ? "(opcional ao manter)" : "*"}
                  </Label>
                  {hasSavedSecret && maskedSecret ? (
                    <Badge
                      variant="secondary"
                      className="font-mono text-[11px] font-normal"
                    >
                      Salva: {maskedSecret}
                    </Badge>
                  ) : null}
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="platform-evo-global-key"
                    type={showKey ? "text" : "password"}
                    placeholder={
                      hasSavedSecret
                        ? "Deixe em branco para manter a chave atual"
                        : "Cole a Global API Key do servidor"
                    }
                    value={globalApiKey}
                    onChange={(e) => setGlobalApiKey(e.target.value)}
                    required={!hasSavedSecret}
                    className="min-h-11 pr-11 font-mono text-xs sm:min-h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-label={
                      showKey
                        ? "Ocultar Global API Key"
                        : "Mostrar Global API Key"
                    }
                    className="absolute right-1 flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showKey ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Criptografada com AES-256-GCM no banco; nunca exposta às igrejas.
                </p>
              </div>
            </div>

            {/* Health details box */}
            <div
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                lastTestInfo?.ok
                  ? "border-emerald-500/25 bg-emerald-500/5"
                  : lastTestInfo && !lastTestInfo.ok
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
                  {evolution?.lastHealthCheckedAt
                    ? `Última verificação: ${formatDateTime(evolution.lastHealthCheckedAt)}`
                    : "Nenhuma verificação registrada ainda."}
                  {lastTestInfo?.instanceCount !== undefined
                    ? ` · ${lastTestInfo.instanceCount} instâncias no servidor`
                    : ""}
                </p>
                {lastTestInfo?.error ? (
                  <p className="font-medium text-destructive">
                    {lastTestInfo.error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isTesting || !hasSavedSecret}
                  onClick={handleTestConnection}
                  className="min-h-11 gap-2 sm:min-h-9"
                >
                  {isTesting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ActivityIcon className="size-4" />
                  )}
                  Testar conexão
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
          </form>
        </CardContent>
      </Card>

      {/* Secondary / Future Slots */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Outros provedores da plataforma
          </h2>
          <Link
            href="/platform/operators"
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver auditoria de alterações
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {SECONDARY_PROVIDERS.map((slot) => {
            const Icon = slot.icon;
            const dbRecord = integrations.find(
              (item) => item.provider === slot.provider,
            );
            const active = Boolean(dbRecord?.isEnabled);
            return (
              <Card key={slot.provider} className="flex flex-col justify-between">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className="gap-1 text-[11px]"
                    >
                      <SparklesIcon className="size-3" />
                      {active ? "Configurado" : "Em breve"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{slot.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {slot.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  Estrutura pronta para ativação centralizada sem expor chaves às
                  igrejas.
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

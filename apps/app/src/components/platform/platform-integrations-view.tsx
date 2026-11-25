"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BellRingIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  MailIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  ServerIcon,
  SparklesIcon,
} from "lucide-react";

import {
  listPlatformIntegrationsAction,
  resetPlatformIntegrationToEnvAction,
  saveBrevoPlatformIntegrationAction,
  saveEvolutionPlatformIntegrationAction,
  saveWebPushPlatformIntegrationAction,
  testBrevoPlatformIntegrationAction,
  testEvolutionPlatformIntegrationAction,
  testWebPushPlatformIntegrationAction,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type PlatformIntegrationsViewProps = {
  initialIntegrations: PlatformIntegrationView[];
};

type HealthFeedback = {
  ok: boolean;
  latencyMs: number | null;
  instanceCount?: number;
  error?: string | null;
} | null;

type ResetTarget = {
  provider: string;
  displayName: string;
};

function readStringConfig(
  integration: PlatformIntegrationView,
  key: string,
  fallback = "",
): string {
  const val = integration.config?.[key];
  return typeof val === "string" ? val : fallback;
}

function healthFeedbackFromIntegration(
  integration: PlatformIntegrationView,
): HealthFeedback {
  if (!integration.lastHealthStatus) return null;
  return {
    ok: integration.lastHealthStatus === "healthy",
    latencyMs: integration.lastHealthLatencyMs,
    error: integration.lastHealthError,
  };
}

function emptyIntegration(
  provider: string,
  displayName: string,
): PlatformIntegrationView {
  return {
    provider,
    displayName,
    source: "unconfigured",
    hasEnvFallback: false,
    isEnabled: false,
    config: {},
    hasSecret: false,
    maskedSecret: null,
    secretMasks: {},
    lastHealthStatus: null,
    lastHealthLatencyMs: null,
    lastHealthCheckedAt: null,
    lastHealthError: null,
  };
}

function IntegrationSourceBadge({
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

function IntegrationHealthBadge({
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

function IntegrationCardHeader({
  icon,
  title,
  description,
  integration,
  health,
  isEnabled,
  onEnabledChange,
  switchId,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  integration: PlatformIntegrationView;
  health: HealthFeedback;
  isEnabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  switchId: string;
}) {
  return (
    <CardHeader className="border-b border-border/60 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-heading text-xl tracking-tight">
                {title}
              </CardTitle>
              <IntegrationSourceBadge source={integration.source} />
              <IntegrationHealthBadge health={health} isEnabled={isEnabled} />
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start rounded-lg border border-border/70 bg-muted/30 px-3 py-2 sm:self-center">
          <Label
            htmlFor={switchId}
            className="text-xs font-medium text-foreground cursor-pointer"
          >
            Provedor habilitado
          </Label>
          <Switch
            id={switchId}
            checked={isEnabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>
    </CardHeader>
  );
}

function SecretFieldInput({
  id,
  label,
  value,
  onChange,
  mask,
  source,
  required,
  placeholderWithMask,
  placeholderEmpty,
  helperText,
  toggleAriaLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  mask: string | null;
  source: PlatformIntegrationView["source"];
  required?: boolean;
  placeholderWithMask: string;
  placeholderEmpty: string;
  helperText: string;
  toggleAriaLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label} {mask ? "(opcional ao manter)" : required ? "*" : "(opcional)"}
        </Label>
        {mask ? (
          <Badge
            variant="secondary"
            className="font-mono text-[11px] font-normal"
          >
            {source === "env" ? `Via .env: ${mask}` : `Salva: ${mask}`}
          </Badge>
        ) : null}
      </div>
      <div className="relative flex items-center">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={mask ? placeholderWithMask : placeholderEmpty}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={Boolean(required && !mask)}
          className="min-h-11 pr-11 font-mono text-xs sm:min-h-9"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? `Ocultar ${toggleAriaLabel}` : `Mostrar ${toggleAriaLabel}`}
          className="absolute right-1 flex min-h-10 min-w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer sm:min-h-8 sm:min-w-8"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

function IntegrationHealthFooter({
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

function EvolutionIntegrationCard({
  integration,
  onRefresh,
  onRequestReset,
  isResetting,
}: {
  integration: PlatformIntegrationView;
  onRefresh: () => Promise<void>;
  onRequestReset: () => void;
  isResetting: boolean;
}) {
  const [apiUrl, setApiUrl] = useState(readStringConfig(integration, "apiUrl"));
  const [globalApiKey, setGlobalApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(
    integration.source === "unconfigured" ? true : integration.isEnabled,
  );
  const [health, setHealth] = useState<HealthFeedback>(
    healthFeedbackFromIntegration(integration),
  );

  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();

  const keyMask =
    integration.secretMasks?.globalApiKey ?? integration.maskedSecret ?? null;
  const hasSecret = Boolean(integration.hasSecret || keyMask);

  function handleSave(e: React.FormEvent) {
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
        setHealth({ ok: res.health.ok, latencyMs: res.health.latencyMs });
      }
      await onRefresh();
      toast.success("Configuração global da Evolution Go salva!");
    });
  }

  function handleTest() {
    startTesting(async () => {
      const res = await testEvolutionPlatformIntegrationAction();
      setHealth({
        ok: res.ok,
        latencyMs: res.latencyMs,
        instanceCount: res.instanceCount,
        error: res.error,
      });
      await onRefresh();
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

function BrevoIntegrationCard({
  integration,
  onRefresh,
  onRequestReset,
  isResetting,
}: {
  integration: PlatformIntegrationView;
  onRefresh: () => Promise<void>;
  onRequestReset: () => void;
  isResetting: boolean;
}) {
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
  const [health, setHealth] = useState<HealthFeedback>(
    healthFeedbackFromIntegration(integration),
  );

  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();

  const keyMask =
    integration.secretMasks?.apiKey ?? integration.maskedSecret ?? null;
  const hasSecret = Boolean(integration.hasSecret || keyMask);

  function handleSave(e: React.FormEvent) {
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
    startTesting(async () => {
      const res = await testBrevoPlatformIntegrationAction();
      setHealth({
        ok: res.ok,
        latencyMs: res.latencyMs,
        error: res.error,
      });
      await onRefresh();
      if (res.ok) {
        toast.success(`Brevo conectado (${res.latencyMs ?? 0}ms).`);
      } else {
        toast.error(res.error || "Falha ao testar conta Brevo.");
      }
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

function WebPushIntegrationCard({
  integration,
  onRefresh,
  onRequestReset,
  isResetting,
}: {
  integration: PlatformIntegrationView;
  onRefresh: () => Promise<void>;
  onRequestReset: () => void;
  isResetting: boolean;
}) {
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
  const [health, setHealth] = useState<HealthFeedback>(
    healthFeedbackFromIntegration(integration),
  );

  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();

  const vapidPrivateMask = integration.secretMasks?.vapidPrivateKey ?? null;
  const oneSignalKeyMask =
    integration.secretMasks?.oneSignalRestApiKey ?? null;
  const hasVapidSecret = Boolean(vapidPrivateMask || integration.hasSecret);

  function handleSave(e: React.FormEvent) {
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
    startTesting(async () => {
      const res = await testWebPushPlatformIntegrationAction();
      setHealth({
        ok: res.ok,
        latencyMs: res.latencyMs,
        error: res.error,
      });
      await onRefresh();
      if (res.ok) {
        toast.success(`Web Push válido (${res.latencyMs ?? 0}ms).`);
      } else {
        toast.error(res.error || "Configuração de Web Push inválida.");
      }
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

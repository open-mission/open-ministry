"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  LockIcon,
  MessageSquareIcon,
  PauseCircleIcon,
  PhoneIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SendIcon,
  SparklesIcon,
  UnplugIcon,
} from "lucide-react";

import {
  checkChurchWhatsAppStatusAction,
  createChurchWhatsAppInstanceAction,
  disconnectChurchWhatsAppInstanceAction,
  getChurchWhatsAppViewAction,
  refreshChurchWhatsAppQrAction,
  sendChurchWhatsAppTestMessageAction,
  toggleChurchWhatsAppActiveAction,
  type ChurchWhatsAppView,
} from "@/app/actions/church-whatsapp";
import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { EvolutionMessageLogsCard } from "@/components/settings/evolution-message-logs";
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
import { cn } from "@/lib/utils";
import { formatBrazilianPhone } from "@/lib/whatsapp-prompt";

type AdminEvolutionApiCardProps = {
  initialView: ChurchWhatsAppView;
  initialQrCode?: string | null;
};

const DATA_IMAGE_QR_RE =
  /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i;
const STRICT_BASE64_RE =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

/**
 * Valida estritamente o QR Code retornado pela Evolution API.
 * Aceita apenas `data:image/(png|jpeg|webp);base64,<base64-valido>` ou base64 puro
 * convertido para PNG; rejeita SVG, esquemas data: inseguros e URLs http(s).
 */
export function normalizeQrCodeSrc(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^data:/i.test(trimmed)) {
    const match = DATA_IMAGE_QR_RE.exec(trimmed);
    if (!match) return null;
    const [, mime, payload] = match;
    if (!mime || !payload || !STRICT_BASE64_RE.test(payload)) {
      return null;
    }
    return `data:image/${mime.toLowerCase()};base64,${payload}`;
  }

  if (STRICT_BASE64_RE.test(trimmed)) {
    return `data:image/png;base64,${trimmed}`;
  }

  return null;
}

export function AdminEvolutionApiCard({
  initialView,
  initialQrCode = null,
}: AdminEvolutionApiCardProps) {
  const [view, setView] = useState<ChurchWhatsAppView>(initialView);
  const [qrCode, setQrCode] = useState<string | null>(initialQrCode);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const safeQrCodeSrc = normalizeQrCodeSrc(qrCode);
  const hasInvalidQrCode = Boolean(qrCode && !safeQrCodeSrc);

  const [isMutating, startMutating] = useTransition();
  const [isCheckingStatus, startCheckingStatus] = useTransition();
  const [isTogglingActive, startTogglingActive] = useTransition();
  const [isDisconnecting, startDisconnecting] = useTransition();
  const [isSendingTest, startSendingTest] = useTransition();

  async function reloadView() {
    const next = await getChurchWhatsAppViewAction();
    if (next) {
      setView(next);
      if (next.state === "connected") {
        setQrCode(null);
        setPairingCode(null);
      }
    }
  }

  // Atualização automática leve enquanto o QR Code válido está exibido na tela
  useEffect(() => {
    if (view.state !== "pairing" || !safeQrCodeSrc) return;

    const timer = setInterval(() => {
      void checkChurchWhatsAppStatusAction()
        .then(async (res) => {
          if (res.connected) {
            setQrCode(null);
            setPairingCode(null);
            await reloadView();
            toast.success("WhatsApp da igreja conectado!");
          }
        })
        .catch(() => {
          // ignora falha transitória de polling
        });
    }, 5000);

    return () => clearInterval(timer);
  }, [view.state, safeQrCodeSrc]);

  function applyQrCodeResponse(
    nextQr: string | undefined,
    nextPairing: string | undefined,
    successToast: string,
  ) {
    const validatedQr = nextQr ? normalizeQrCodeSrc(nextQr) : null;
    if (nextQr && !validatedQr) {
      const invalidMessage =
        "O QR Code retornado é inválido ou usa formato não suportado. Tente gerar novamente.";
      setQrCode(null);
      setPairingCode(nextPairing ?? null);
      setActionError(invalidMessage);
      toast.error(invalidMessage);
      return;
    }

    setQrCode(validatedQr);
    setPairingCode(nextPairing ?? null);
    toast.success(successToast);
  }

  function handleCreateConnection() {
    setActionError(null);
    startMutating(async () => {
      const res = await createChurchWhatsAppInstanceAction();
      if (!res.ok) {
        const message =
          res.error || "Não foi possível criar a conexão do WhatsApp.";
        setActionError(message);
        toast.error(message);
        return;
      }
      await reloadView();
      applyQrCodeResponse(
        res.qrCode,
        res.pairingCode,
        "Conexão criada! Escaneie o QR Code com o celular.",
      );
    });
  }

  function handleRefreshQr() {
    setActionError(null);
    startMutating(async () => {
      const res = await refreshChurchWhatsAppQrAction();
      if (!res.ok) {
        const message =
          res.error || "Não foi possível gerar um novo QR Code.";
        setActionError(message);
        toast.error(message);
        return;
      }
      await reloadView();
      applyQrCodeResponse(
        res.qrCode,
        res.pairingCode,
        "Novo QR Code gerado.",
      );
    });
  }

  function handleCheckStatus() {
    setActionError(null);
    startCheckingStatus(async () => {
      const res = await checkChurchWhatsAppStatusAction();
      await reloadView();
      if (res.connected) {
        setQrCode(null);
        setPairingCode(null);
        toast.success("WhatsApp conectado e pronto para envios!");
      } else if (res.ok) {
        toast.info("Ainda aguardando leitura do QR Code no celular.");
      } else {
        const message = res.error || "Não foi possível verificar a conexão.";
        setActionError(message);
        toast.error(message);
      }
    });
  }

  function handleToggleActive(nextActive: boolean) {
    startTogglingActive(async () => {
      const res = await toggleChurchWhatsAppActiveAction(nextActive);
      if (!res.ok) {
        toast.error(res.error || "Erro ao alterar o status dos envios.");
        return;
      }
      setView((prev) =>
        prev.state === "connected" || prev.state === "pairing"
          ? { ...prev, isActive: nextActive }
          : prev,
      );
      toast.success(
        nextActive
          ? "Envios automáticos de WhatsApp ativados."
          : "Envios automáticos de WhatsApp pausados.",
      );
    });
  }

  function handleConfirmDisconnect() {
    startDisconnecting(async () => {
      const res = await disconnectChurchWhatsAppInstanceAction();
      if (!res.ok) {
        toast.error(res.error || "Não foi possível desconectar o WhatsApp.");
        return;
      }
      setDisconnectOpen(false);
      setQrCode(null);
      setPairingCode(null);
      await reloadView();
      toast.success("Número desconectado da igreja.");
    });
  }

  function handleSendTestMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Informe um telefone com DDD para enviar o teste.");
      return;
    }

    startSendingTest(async () => {
      const res = await sendChurchWhatsAppTestMessageAction(testPhone.trim());
      if (res.ok) {
        toast.success("Mensagem de teste enviada no WhatsApp!");
      } else {
        toast.error(res.error || "Falha ao enviar mensagem de teste.");
      }
    });
  }

  function handleCopyPairingCode() {
    if (!pairingCode || typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(pairingCode).then(() => {
      toast.success("Código de pareamento copiado!");
    });
  }

  // State A: Blocked by plan or platform status
  if (view.state === "blocked") {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <LockIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="font-heading text-xl tracking-tight">
                  WhatsApp da Igreja
                </CardTitle>
                <CardDescription>
                  Notificações automáticas de escalas e avisos pastorais
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {view.planName ? `Plano ${view.planName}` : "Recurso bloqueado"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {view.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              Com o WhatsApp oficial liberado no plano da igreja, você conecta
              seu número apenas lendo um QR Code — sem configurar servidor nem
              chaves técnicas.
            </p>
          </div>

          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <SparklesIcon className="size-3.5 shrink-0 text-primary" />
              <span>Confirmação de escalas com aviso automático antes do culto</span>
            </li>
            <li className="flex items-center gap-2">
              <SparklesIcon className="size-3.5 shrink-0 text-primary" />
              <span>Disparo de comunicados e avisos pastorais por departamento</span>
            </li>
            <li className="flex items-center gap-2">
              <SparklesIcon className="size-3.5 shrink-0 text-primary" />
              <span>Histórico de entrega e reenvio em um clique</span>
            </li>
          </ul>

          <div className="rounded-xl border border-dashed border-border p-3.5 text-xs text-muted-foreground">
            Solicite a liberação do recurso com a equipe de suporte da plataforma
            OpenMinistry.
          </div>
        </CardContent>
      </Card>
    );
  }

  // State B: Ready to provision
  if (view.state === "ready") {
    const steps =
      view.steps.length > 0
        ? view.steps
        : [
            "Crie a conexão do WhatsApp para sua igreja.",
            "Escaneie o QR Code com o celular.",
            "Pronto: escalas e avisos chegam automaticamente.",
          ];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <MessageSquareIcon className="size-5" />
                </div>
                <div>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    Ative o WhatsApp da sua igreja
                  </CardTitle>
                  <CardDescription>
                    Conecte o número da secretaria ou ministério em poucos passos.
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                Pronto para conectar
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <ol className="grid gap-3 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step}
                  className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1.5"
                >
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-foreground">
                    {step}
                  </p>
                </li>
              ))}
            </ol>

            {actionError ? (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            ) : null}

            <Button
              type="button"
              disabled={isMutating}
              onClick={handleCreateConnection}
              className="min-h-11 w-full gap-2 sm:min-h-10 sm:w-auto"
            >
              {isMutating ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <QrCodeIcon className="size-4" />
              )}
              Criar conexão com WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // States C & D: pairing | connected
  const isConnected = view.state === "connected";
  const hasError = Boolean(view.lastError || actionError);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  isConnected
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}
              >
                <MessageSquareIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-heading text-xl tracking-tight">
                    WhatsApp da Igreja
                  </CardTitle>
                  {isConnected ? (
                    view.isActive ? (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2Icon className="size-3.5" />
                        Conectado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      >
                        <PauseCircleIcon className="size-3.5" />
                        Pausado
                      </Badge>
                    )
                  ) : hasError ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangleIcon className="size-3.5" />
                      Desconectado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    >
                      <QrCodeIcon className="size-3.5" />
                      Aguardando QR Code
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Conexão gerenciada:{" "}
                  <span className="font-mono text-xs text-foreground">
                    {view.instanceName}
                  </span>
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start rounded-lg border border-border/70 bg-muted/30 px-3 py-2 sm:self-center">
              <Label
                htmlFor="church-whatsapp-active-switch"
                className="text-xs font-medium text-foreground cursor-pointer"
              >
                Envios automáticos
              </Label>
              <Switch
                id="church-whatsapp-active-switch"
                checked={view.isActive}
                disabled={isTogglingActive}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {!view.isActive ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
              <PauseCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Os envios automáticos estão pausados por decisão da igreja.
                Ative a chave acima para retomar o envio de escalas e avisos.
              </span>
            </div>
          ) : null}

          {view.lastError || actionError ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Atenção na conexão do WhatsApp</p>
                <p>{actionError || view.lastError}</p>
              </div>
            </div>
          ) : null}

          {isConnected ? (
            <>
              {/* Connected identity summary */}
              <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <PhoneIcon className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {view.connectedProfileName || "WhatsApp da Igreja"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {view.connectedPhone || "Número verificado"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCheckingStatus}
                    onClick={handleCheckStatus}
                    className="min-h-11 gap-1.5 sm:min-h-9"
                  >
                    {isCheckingStatus ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-3.5" />
                    )}
                    Verificar status
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDisconnectOpen(true)}
                    className="min-h-11 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-9"
                  >
                    <UnplugIcon className="size-3.5" />
                    Desconectar
                  </Button>
                </div>
              </div>

              {/* Send test message */}
              <form
                onSubmit={handleSendTestMessage}
                className="space-y-3 border-t border-border/60 pt-5"
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor="church-wa-test-phone"
                    className="text-sm font-semibold"
                  >
                    Enviar mensagem de teste
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envie uma mensagem para o seu próprio WhatsApp para validar
                    a entrega.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="church-wa-test-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="Ex.: (11) 99999-8888"
                    value={testPhone}
                    onChange={(e) =>
                      setTestPhone(formatBrazilianPhone(e.target.value))
                    }
                    className="min-h-11 font-mono text-xs sm:min-h-9 sm:max-w-xs"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isSendingTest || !testPhone.trim()}
                    className="min-h-11 gap-1.5 sm:min-h-9"
                  >
                    {isSendingTest ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <SendIcon className="size-3.5" />
                    )}
                    Enviar teste agora
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* Pairing view: QR Code + Pairing Code + Actions */
            <div className="space-y-5">
              {safeQrCodeSrc ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-muted/20 p-5 text-center sm:flex-row sm:items-start sm:text-left">
                  <div className="shrink-0 rounded-2xl border border-border bg-white p-3 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeQrCodeSrc}
                      alt="QR Code para conectar o WhatsApp da igreja"
                      className="size-48 object-contain"
                    />
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <p className="font-heading text-base font-semibold text-foreground">
                        Escaneie no WhatsApp do celular
                      </p>
                      <p className="text-muted-foreground">
                        Abra o WhatsApp &gt; <strong>Dispositivos conectados</strong>{" "}
                        &gt; <strong>Conectar dispositivo</strong> e aponte a câmera.
                      </p>
                    </div>

                    {pairingCode ? (
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm font-semibold tracking-widest text-foreground">
                          {pairingCode}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyPairingCode}
                          className="min-h-9 gap-1.5"
                        >
                          <CopyIcon className="size-3.5" />
                          Copiar código
                        </Button>
                      </div>
                    ) : null}

                    <p className="text-[11px] text-muted-foreground">
                      Verificando confirmação automaticamente a cada poucos segundos.
                    </p>
                  </div>
                </div>
              ) : hasInvalidQrCode ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    QR Code inválido ou em formato não suportado. Gere um novo
                    QR Code para conectar o aparelho.
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-muted/25 p-4 text-xs text-muted-foreground">
                  Gere um novo QR Code para parear o aparelho da igreja ou
                  verifique se a conexão já foi concluída no celular.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={isMutating}
                  onClick={handleRefreshQr}
                  className="min-h-11 gap-2 sm:min-h-9"
                >
                  {isMutating ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <QrCodeIcon className="size-4" />
                  )}
                  {safeQrCodeSrc ? "Recriar QR Code" : "Gerar QR Code"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isCheckingStatus}
                  onClick={handleCheckStatus}
                  className="min-h-11 gap-2 sm:min-h-9"
                >
                  {isCheckingStatus ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                  Verificar conexão
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisconnectOpen(true)}
                  className="min-h-11 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-9"
                >
                  <UnplugIcon className="size-4" />
                  Desconectar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to Dedicated WhatsApp Messages Page + Inline History */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MessageSquareIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            Mensagens e Confirmações de Entrega
          </h4>
          <p className="text-xs text-muted-foreground">
            Consulte abaixo o histórico recente ou abra a página dedicada para
            filtros ampliados.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="min-h-11 shrink-0 gap-1.5 text-xs sm:min-h-8"
        >
          <Link href="/whatsapp">
            <span>Abrir página completa</span>
            <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
          </Link>
        </Button>
      </div>

      <EvolutionMessageLogsCard />

      <ResponsiveDialog
        open={disconnectOpen}
        onOpenChange={(next) => {
          if (!isDisconnecting) setDisconnectOpen(next);
        }}
        title="Desconectar WhatsApp da igreja?"
        titleClassName="text-lg sm:text-xl"
        description="O número atual será desconectado e os envios automáticos ficarão interrompidos até escanear um novo QR Code."
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDisconnecting}
              onClick={() => setDisconnectOpen(false)}
              className="min-h-11 sm:min-h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDisconnecting}
              onClick={handleConfirmDisconnect}
              className="min-h-11 gap-2 sm:min-h-9"
            >
              {isDisconnecting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UnplugIcon className="size-4" />
              )}
              Confirmar desconexão
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Você poderá reconectar o mesmo número ou outro aparelho a qualquer
          momento.
        </p>
      </ResponsiveDialog>
    </div>
  );
}

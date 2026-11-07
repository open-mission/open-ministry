"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BellIcon,
  BellRingIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  SendIcon,
  SmartphoneIcon,
  SparklesIcon,
} from "lucide-react";

import {
  getPushSubscriptionStatusAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushNotificationAction,
} from "@/app/actions/push-notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPreferencesCard() {
  const [scheduleAlerts, setScheduleAlerts] = useState(true);
  const [churchAnnouncements, setChurchAnnouncements] = useState(true);
  const [birthdayReminders, setBirthdayReminders] = useState(true);

  // Push notification state
  const [pushSupported] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
  );
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    () =>
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "default",
  );
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState("");
  const [loadingPush, setLoadingPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    if (pushSupported) {
      getPushSubscriptionStatusAction().then((res) => {
        if (res.ok) {
          setIsPushSubscribed(res.isSubscribed);
          setVapidPublicKey(res.publicKey);
        }
      });
    }
  }, [pushSupported]);

  function handleToggle(
    name: string,
    value: boolean,
    setter: (val: boolean) => void,
  ) {
    setter(value);
    toast.success(`Preferência de ${name} ${value ? "ativada" : "desativada"}.`);
  }

  async function handleEnablePush() {
    if (!pushSupported) {
      toast.error("Notificações push não são suportadas neste navegador.");
      return;
    }

    setLoadingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        toast.error("Permissão de notificações não concedida.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && vapidPublicKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
        });
      }

      if (subscription) {
        const json = subscription.toJSON();
        const res = await savePushSubscriptionAction({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: json.keys?.p256dh || "",
            auth: json.keys?.auth || "",
          },
        });

        if (res.ok) {
          setIsPushSubscribed(true);
          toast.success("Notificações push ativadas com sucesso!");
        } else {
          toast.error(res.error || "Erro ao registrar subscrição no servidor.");
        }
      }
    } catch (err) {
      console.error("Falha ao ativar notificações push:", err);
      toast.error("Não foi possível ativar as notificações push.");
    } finally {
      setLoadingPush(false);
    }
  }

  async function handleDisablePush() {
    setLoadingPush(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await removePushSubscriptionAction(subscription.endpoint);
      }
      setIsPushSubscribed(false);
      toast.success("Notificações push desativadas neste dispositivo.");
    } catch (err) {
      console.error("Erro ao desativar push:", err);
      toast.error("Não foi possível desativar as notificações.");
    } finally {
      setLoadingPush(false);
    }
  }

  async function handleSendTestPush() {
    setTestingPush(true);
    try {
      const res = await sendTestPushNotificationAction();
      if (res.ok) {
        toast.success("Notificação de teste disparada! Verifique seu dispositivo.");
      } else {
        toast.error(res.error || "Falha ao enviar notificação de teste.");
      }
    } catch {
      toast.error("Erro ao disparar teste.");
    } finally {
      setTestingPush(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Notificações Push Web / PWA */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SmartphoneIcon className="size-4.5" />
            </span>
            <div>
              <CardTitle className="font-heading text-xl tracking-tight">
                Notificações Push no Celular / PWA
              </CardTitle>
              <CardDescription className="text-xs">
                Receba alertas instantâneos de escalas e avisos mesmo com o app fechado.
              </CardDescription>
            </div>
          </div>

          <div>
            {isPushSubscribed ? (
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              >
                <CheckCircle2Icon className="size-3" />
                Ativo neste dispositivo
              </Badge>
            ) : pushPermission === "denied" ? (
              <Badge variant="destructive" className="text-xs">
                Bloqueado no navegador
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Inativo
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2 text-xs">
            <p className="font-medium text-foreground">
              {isPushSubscribed
                ? "Este dispositivo está conectado para receber notificações em tempo real."
                : "Ative para ser alertado quando for escalado para um culto ou receber avisos da liderança."}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              No iPhone (iOS 16.4+), lembre-se de primeiro adicionar o OpenMinistry
              à Tela de Início via Safari para habilitar o suporte a notificações push nativas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isPushSubscribed ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleEnablePush}
                disabled={loadingPush || pushPermission === "denied"}
                className="h-9 px-4 text-xs"
              >
                <BellRingIcon data-icon="inline-start" className="size-3.5" />
                {loadingPush ? "Ativando..." : "Ativar Notificações Push"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestPush}
                  disabled={testingPush}
                  className="h-9 px-3 text-xs"
                >
                  <SendIcon data-icon="inline-start" className="size-3.5" />
                  {testingPush ? "Enviando..." : "Disparar teste push"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisablePush}
                  disabled={loadingPush}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-destructive"
                >
                  Desativar neste aparelho
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Preferências de Conteúdo in-app */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-xl tracking-tight">
              Preferências de Alertas In-App
            </CardTitle>
            <CardDescription>
              Escolha os avisos que você deseja receber no sino e na barra de notificações do painel.
            </CardDescription>
          </div>

          <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
            <Link href="/dashboard/notifications">
              <BellIcon className="size-3.5" />
              Abrir Central
              <ExternalLinkIcon className="size-3 text-muted-foreground" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="divide-y rounded-lg border">
            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5 pr-4">
                <label
                  htmlFor="toggle-schedules"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Escalas e escalas alteradas
                </label>
                <p className="text-xs text-muted-foreground">
                  Seja notificado quando sua liderança te escalar para um culto ou modificar sua função.
                </p>
              </div>
              <Switch
                id="toggle-schedules"
                checked={scheduleAlerts}
                onCheckedChange={(val) =>
                  handleToggle("escalas", val, setScheduleAlerts)
                }
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5 pr-4">
                <label
                  htmlFor="toggle-announcements"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Avisos da administração e liderança
                </label>
                <p className="text-xs text-muted-foreground">
                  Comunicados gerais para toda a igreja ou específicos do seu departamento.
                </p>
              </div>
              <Switch
                id="toggle-announcements"
                checked={churchAnnouncements}
                onCheckedChange={(val) =>
                  handleToggle("avisos da igreja", val, setChurchAnnouncements)
                }
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5 pr-4">
                <label
                  htmlFor="toggle-birthdays"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Lembretes de aniversariantes
                </label>
                <p className="text-xs text-muted-foreground">
                  Destaques quando irmãos da equipe estiverem comemorando aniversário hoje ou amanhã.
                </p>
              </div>
              <Switch
                id="toggle-birthdays"
                checked={birthdayReminders}
                onCheckedChange={(val) =>
                  handleToggle("lembretes de aniversário", val, setBirthdayReminders)
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <SparklesIcon className="size-4 shrink-0 text-primary" />
            <span>
              As notificações in-app aparecem instantaneamente no sino superior e no aplicativo móvel.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

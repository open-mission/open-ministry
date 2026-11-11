"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRingIcon, XIcon } from "lucide-react";

import { checkIsStandalone } from "@/components/pwa/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  dismissPwaNotificationPrompt,
  isPwaNotificationPromptDismissed,
  isPushActiveOnDevice,
  isPushSupported,
  subscribeDeviceToPush,
} from "@/lib/push-client";

export function PwaNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only proceed on client
    if (typeof window === "undefined") return;

    let mounted = true;

    async function evaluatePrompt() {
      // Must be standalone (PWA installed)
      const standalone = checkIsStandalone();
      if (!standalone) return;

      // Must support push notifications
      if (!isPushSupported()) return;

      // Must not be dismissed recently
      if (isPwaNotificationPromptDismissed()) return;

      // If user explicitly denied notifications in browser settings, do not show
      if (Notification.permission === "denied") return;

      // If already active on device, do not show
      const isActive = await isPushActiveOnDevice();
      if (isActive) return;

      if (mounted) {
        // Slight delay to avoid sudden layout shift when app launches
        setTimeout(() => {
          if (mounted) {
            setVisible(true);
          }
        }, 1500);
      }
    }

    evaluatePrompt();

    // Also listen to appinstalled event when user just finished native installation
    const handleAppInstalled = () => {
      evaluatePrompt();
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      mounted = false;
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!visible) return null;

  async function handleEnable() {
    setLoading(true);
    try {
      const res = await subscribeDeviceToPush();
      if (res.ok) {
        toast.success("Notificações push ativadas com sucesso!");
        dismissPwaNotificationPrompt(365);
        setVisible(false);
      } else {
        toast.error(res.error || "Não foi possível ativar as notificações.");
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "denied"
        ) {
          dismissPwaNotificationPrompt(14);
          setVisible(false);
        }
      }
    } catch {
      toast.error("Erro inesperado ao ativar notificações.");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    dismissPwaNotificationPrompt(7);
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de notificações do aplicativo"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 sm:right-6 sm:bottom-6 sm:left-auto sm:max-w-md"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-background/95 p-4 shadow-xl backdrop-blur-md dark:border-primary/30">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
            <BellRingIcon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              Ativar notificações do app
            </h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Você instalou o aplicativo! Ative as notificações para receber
              escalas, mudanças e avisos importantes da igreja em tempo real.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar aviso de notificações"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Agora não
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleEnable}
            disabled={loading}
            className="h-8 px-3.5 text-xs font-medium gap-1.5"
          >
            <BellRingIcon className="size-3.5" data-icon="inline-start" />
            {loading ? "Ativando..." : "Ativar Notificações"}
          </Button>
        </div>
      </div>
    </div>
  );
}

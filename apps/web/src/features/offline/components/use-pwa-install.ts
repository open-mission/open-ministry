"use client";

import { useEffect, useState } from "react";

import { recordPwaInstallAction } from "@/app/actions/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type PwaPlatform = "ios" | "android" | "desktop";

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent.toLowerCase();
  if (
    /iphone|ipad|ipod/.test(ua) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop";
}

export function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(
      (window.navigator as unknown as { standalone?: boolean }).standalone,
    )
  );
}

const DISMISS_KEY = "openministry_pwa_dismissed_until";

export function isPwaPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const item = window.localStorage.getItem(DISMISS_KEY);
    if (!item) return false;
    const expiresAt = Number.parseInt(item, 10);
    if (Number.isNaN(expiresAt)) return false;
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export function dismissPwaPrompt(days = 14): void {
  if (typeof window === "undefined") return;
  try {
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, expiresAt.toString());
  } catch {
    // Ignore localStorage errors
  }
}

export function usePwaInstall() {
  const [platform] = useState<PwaPlatform>(() =>
    typeof window !== "undefined" ? detectPwaPlatform() : "desktop",
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(() =>
    typeof window !== "undefined" ? checkIsStandalone() : false,
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstallNatively, setCanInstallNatively] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    typeof window !== "undefined" ? isPwaPromptDismissed() : true,
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstallNatively(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setCanInstallNatively(false);
      void recordPwaInstallAction({ platform, isStandalone: true });
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [platform]);

  const triggerNativeInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setCanInstallNatively(false);
        setIsStandalone(true);
        void recordPwaInstallAction({ platform, isStandalone: true });
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Falha ao invocar prompt nativo de instalação:", err);
      return false;
    }
  };

  const dismiss = (days = 14) => {
    dismissPwaPrompt(days);
    setIsDismissed(true);
  };

  return {
    platform,
    isStandalone,
    canInstallNatively,
    isDismissed,
    triggerNativeInstall,
    dismiss,
  };
}

"use client";

import { useEffect } from "react";

/**
 * Mantém a tela acesa enquanto o modo palco está aberto e readquire o lock
 * quando o músico volta para a aba. Compartilhado entre cifra e letra.
 */
export function useStageWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const requestWakeLock = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Permissão negada ou API indisponível — segue sem manter a tela acesa.
        sentinel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (disposed) return;
      if (document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}

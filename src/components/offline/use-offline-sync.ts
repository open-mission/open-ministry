"use client";

import { useCallback, useEffect, useState } from "react";
import type { OfflinePayload } from "@/lib/offline-types";

const OFFLINE_STORAGE_KEY = "openministry_offline_bundle";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [offlineData, setOfflineData] = useState<OfflinePayload | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
        return saved ? (JSON.parse(saved) as OfflinePayload) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const syncNow = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) {
      return false;
    }

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const response = await fetch("/api/offline-data", {
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        throw new Error(`Falha ao obter dados offline: ${response.status}`);
      }

      const bundle: OfflinePayload = await response.json();
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(bundle));
      setOfflineData(bundle);
      setIsSyncing(false);
      return true;
    } catch (err) {
      console.warn("Sincronização offline ignorada ou falhou:", err);
      setLastSyncError(err instanceof Error ? err.message : "Erro desconhecido");
      setIsSyncing(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sincronização inicial automática quando online com delay não-bloqueante
    const initialSyncTimer = setTimeout(() => {
      if (navigator.onLine) {
        void syncNow();
      }
    }, 500);

    return () => {
      clearTimeout(initialSyncTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  return {
    isOnline,
    offlineData,
    isSyncing,
    lastSyncError,
    syncNow,
    hasCachedData: Boolean(offlineData),
  };
}

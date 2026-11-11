"use client";

import { useCallback, useEffect, useState } from "react";
import type { OfflinePayload } from "@/lib/offline-types";

const OFFLINE_STORAGE_KEY = "openministry_offline_bundle";
const OFFLINE_LAST_SYNC_KEY = "openministry_offline_last_sync";
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos de cache local

export function useOfflineSync(
  { autoSync = true }: { autoSync?: boolean } = {},
) {
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
      localStorage.setItem(OFFLINE_LAST_SYNC_KEY, String(Date.now()));
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

    // Sincronização inicial automática quando online com delay não-bloqueante (evita re-sync frequente).
    // O banner global desativa isso para não disparar o bundle offline em toda navegação.
    const initialSyncTimer = autoSync
      ? setTimeout(() => {
          if (navigator.onLine) {
            try {
              const lastSync = localStorage.getItem(OFFLINE_LAST_SYNC_KEY);
              const lastSyncTime = lastSync ? Number.parseInt(lastSync, 10) : 0;
              const isFresh =
                Number.isFinite(lastSyncTime) &&
                Date.now() - lastSyncTime < SYNC_INTERVAL_MS;

              if (!isFresh) {
                void syncNow();
              }
            } catch {
              void syncNow();
            }
          }
        }, 500)
      : undefined;

    return () => {
      clearTimeout(initialSyncTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [autoSync, syncNow]);

  return {
    isOnline,
    offlineData,
    isSyncing,
    lastSyncError,
    syncNow,
    hasCachedData: Boolean(offlineData),
  };
}

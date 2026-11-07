"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, WifiOffIcon } from "lucide-react";

import { OfflineViewerDialog } from "@/components/offline/offline-viewer-dialog";
import { useOfflineSync } from "@/components/offline/use-offline-sync";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { isOnline, offlineData, isSyncing, syncNow, hasCachedData } =
    useOfflineSync();
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleOnline = () => {
      setShowRestoredNotice(true);
      timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4000);
    };

    window.addEventListener("online", handleOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Se está online e não acabou de voltar da queda de rede, não exibe nada
  if (isOnline && !showRestoredNotice) {
    return null;
  }

  // Notificação temporária de reconexão
  if (isOnline && showRestoredNotice) {
    return (
      <div className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/80 px-4 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          <span>Conexão restabelecida! Dados sincronizados com o servidor.</span>
        </div>
      </div>
    );
  }

  // Banner ativo quando offline
  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <WifiOffIcon className="size-4 shrink-0 text-amber-600 animate-pulse" />
          <span className="font-medium">
            Você está sem conexão com a internet.
          </span>
          <span className="hidden sm:inline text-amber-800/80 dark:text-amber-300/80">
            {hasCachedData
              ? "Você pode consultar suas escalas e cronogramas salvos."
              : "Nenhum dado salvo localmente no momento."}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <OfflineViewerDialog
            offlineData={offlineData}
            isOnline={isOnline}
            isSyncing={isSyncing}
            onSync={syncNow}
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/30 bg-background/80 hover:bg-background text-amber-900 dark:text-amber-100"
              >
                Abrir Dados Offline
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

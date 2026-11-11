"use client";

import {
  CheckCircle2Icon,
  HardDriveIcon,
  RefreshCwIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { toast } from "sonner";

import { OfflineViewerDialog } from "@/components/offline/offline-viewer-dialog";
import { useOfflineSync } from "@/components/offline/use-offline-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OfflineCacheCard() {
  const {
    isOnline,
    offlineData,
    isSyncing,
    syncNow,
    hasCachedData,
  } = useOfflineSync();

  const handleManualSync = async () => {
    const success = await syncNow();
    if (success) {
      toast.success("Dados sincronizados para uso offline!");
    } else {
      toast.error("Não foi possível sincronizar. Verifique sua conexão.");
    }
  };

  const syncedDate = offlineData
    ? new Date(offlineData.syncedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const roleLabel =
    offlineData?.roleLevel === "admin"
      ? "Administrador / Pastor (Acesso Completo)"
      : offlineData?.roleLevel === "leader"
        ? "Líder de Ministério (Cronogramas & Escala)"
        : "Membro da Igreja (Minhas Escalas)";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HardDriveIcon className="size-5" />
            </span>
            <div>
              <CardTitle className="font-heading text-xl tracking-tight">
                Modo Offline & Cache Local
              </CardTitle>
              <CardDescription className="text-xs">
                Mantenha escalas e a ordem do culto no celular para quando estiver no templo sem sinal.
              </CardDescription>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "self-start sm:self-auto text-xs font-normal",
              isOnline
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
            )}
          >
            {isOnline ? (
              <>
                <WifiIcon className="size-3 mr-1 text-emerald-600" />
                Online
              </>
            ) : (
              <>
                <WifiOffIcon className="size-3 mr-1 text-amber-600" />
                Offline
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1">
            <p className="text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
              Minhas Escalas
            </p>
            <p className="font-heading text-lg font-bold">
              {offlineData?.myAssignments.length ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1">
            <p className="text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
              Cronogramas
            </p>
            <p className="font-heading text-lg font-bold">
              {offlineData?.ordersOfService.length ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1">
            <p className="text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
              Equipes Salvas
            </p>
            <p className="font-heading text-lg font-bold">
              {offlineData?.fullSchedules.length ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1">
            <p className="text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
              Contatos Rápidos
            </p>
            <p className="font-heading text-lg font-bold">
              {offlineData?.emergencyContacts.length ?? 0}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nível de Dados Salvo:</span>
            <span className="font-medium text-foreground">{roleLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Última Sincronização:</span>
            <span className="font-medium text-foreground">
              {syncedDate ?? "Ainda não sincronizado"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            {hasCachedData ? (
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                Dados prontos para uso offline.
              </span>
            ) : (
              <span>Clique para baixar os dados no dispositivo.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="flex-1 sm:flex-initial gap-1.5"
            >
              <RefreshCwIcon
                className={cn("size-3.5", isSyncing && "animate-spin")}
              />
              <span>{isSyncing ? "Sincronizando..." : "Sincronizar Agora"}</span>
            </Button>

            <OfflineViewerDialog
              offlineData={offlineData}
              isOnline={isOnline}
              isSyncing={isSyncing}
              onSync={syncNow}
              trigger={
                <Button size="sm" className="flex-1 sm:flex-initial">
                  Abrir Central Offline
                </Button>
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

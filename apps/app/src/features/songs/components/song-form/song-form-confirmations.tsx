"use client";

import { AlertTriangleIcon, SparklesIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type SongFormConfirmationsProps = {
  showDiscardAlert: boolean;
  onShowDiscardAlertChange: (open: boolean) => void;
  onDiscardChanges: () => void;
  showSyncAlert: boolean;
  onShowSyncAlertChange: (open: boolean) => void;
  onConfirmSyncLyrics: () => void;
};

export function SongFormConfirmations({
  showDiscardAlert,
  onShowDiscardAlertChange,
  onDiscardChanges,
  showSyncAlert,
  onShowSyncAlertChange,
  onConfirmSyncLyrics,
}: SongFormConfirmationsProps) {
  return (
    <>
      {/* DIÁLOGO DE SEGURANÇA: DESCARTAR ALTERAÇÕES NÃO SALVAS */}
      <AlertDialog
        open={showDiscardAlert}
        onOpenChange={onShowDiscardAlertChange}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Descartar alterações não salvas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground sm:text-sm">
              Você possui alterações no formulário da música que ainda não foram
              salvas. Se você fechar agora, todas as edições serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => onShowDiscardAlertChange(false)}>
              Continuar editando
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={onDiscardChanges}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Descartar alterações
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO: SINCRONIZAR LETRA A PARTIR DA CIFRA */}
      <AlertDialog open={showSyncAlert} onOpenChange={onShowSyncAlertChange}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SparklesIcon className="size-5" />
            </div>
            <AlertDialogTitle className="font-heading text-lg font-bold">
              Substituir letra atual pela cifra?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground sm:text-sm">
              A letra atual desta música será apagada e substituída pelos versos
              extraídos da cifra (removendo acordes e tablaturas).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => onShowSyncAlertChange(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmSyncLyrics}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Substituir letra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

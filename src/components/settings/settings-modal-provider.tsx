"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Loader2Icon, SettingsIcon } from "lucide-react";

import { getSettingsDialogDataAction } from "@/app/actions/settings";
import {
  SettingsView,
  type SettingsViewProps,
} from "@/components/settings/settings-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME, APP_VERSION } from "@/lib/version";

type SettingsModalContextValue = {
  open: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const SettingsModalContext = createContext<SettingsModalContextValue | null>(
  null,
);

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error(
      "useSettingsModal deve ser utilizado dentro de SettingsModalProvider",
    );
  }
  return context;
}

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SettingsViewProps | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const loadData = useCallback(() => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const result = await getSettingsDialogDataAction();
        setData(result as unknown as SettingsViewProps);
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  const openSettings = useCallback(() => {
    setOpen(true);
    if (!data) {
      loadData();
    }
  }, [data, loadData]);

  const closeSettings = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <SettingsModalContext.Provider
      value={{ open, openSettings, closeSettings }}
    >
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden border-border/80 shadow-2xl max-h-[90vh]">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SettingsIcon className="size-4" />
              </span>
              <div>
                <DialogTitle className="font-heading text-lg tracking-tight leading-none">
                  Configurações do Sistema
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {APP_NAME} v{APP_VERSION} · Preferências da conta e igreja
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-0 overflow-y-auto max-h-[calc(90vh-70px)]">
            {isLoading || !data ? (
              <div className="flex flex-col md:flex-row min-h-[500px]">
                {/* Lateral Sidebar Skeleton */}
                <div className="w-72 border-r bg-muted/30 p-4 space-y-4 hidden md:block">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4">
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-center justify-center py-20 flex-col gap-3 text-muted-foreground">
                    <Loader2Icon className="size-7 animate-spin text-primary" />
                    <p className="text-xs">Carregando configurações...</p>
                  </div>
                </div>
              </div>
            ) : (
              <SettingsView {...data} isModal={true} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SettingsModalContext.Provider>
  );
}

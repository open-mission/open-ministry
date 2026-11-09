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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

  const renderContent = () => {
    if (isLoading || !data) {
      return (
        <div className="flex flex-col md:flex-row min-h-[400px]">
          {/* Lateral Sidebar Skeleton (apenas desktop) */}
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
      );
    }

    return <SettingsView {...data} isModal={true} />;
  };

  return (
    <SettingsModalContext.Provider
      value={{ open, openSettings, closeSettings }}
    >
      {children}

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-[92dvh] max-h-[92dvh] data-[vaul-drawer-direction=bottom]:max-h-[92dvh] flex flex-col gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
            <DrawerHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-muted/20 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SettingsIcon className="size-4" />
                </span>
                <div>
                  <DrawerTitle className="font-heading text-lg tracking-tight leading-none">
                    Configurações do Sistema
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    Configurações do sistema, conta e igreja
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {renderContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
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
                  <DialogDescription className="sr-only">
                    Configurações do sistema, conta e igreja
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-0 overflow-y-auto max-h-[calc(90vh-70px)]">
              {renderContent()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SettingsModalContext.Provider>
  );
}

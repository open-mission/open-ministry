"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, SmartphoneIcon, XIcon } from "lucide-react";

import { PwaInstallDialog } from "@/components/pwa/pwa-install-dialog";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { Button } from "@/components/ui/button";

export function PwaInstallBanner() {
  const { isStandalone, isDismissed, canInstallNatively, triggerNativeInstall, dismiss } =
    usePwaInstall();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isStandalone || isDismissed) return;

    // Slight delay to avoid layout shift on initial load
    const timer = setTimeout(() => {
      setMounted(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isStandalone, isDismissed]);

  if (!mounted || isStandalone || isDismissed) {
    return null;
  }

  const handleActionClick = () => {
    if (canInstallNatively) {
      triggerNativeInstall().then((installed) => {
        if (!installed) {
          setDialogOpen(true);
        }
      });
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <div
        role="region"
        aria-label="Aviso de instalação do aplicativo"
        className="fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 animate-in fade-in slide-in-from-bottom-4 duration-300 lg:right-6 lg:bottom-6"
      >
        <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-background/95 p-1 pl-1.5 shadow-xl backdrop-blur-md dark:border-primary/30 lg:max-w-sm lg:gap-3 lg:rounded-2xl lg:p-3.5">
          <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs lg:flex">
            <SmartphoneIcon className="size-5" />
          </div>

          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="text-xs font-semibold text-foreground tracking-tight">
              Instale o OpenMinistry
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              Adicione à tela inicial para acesso rápido
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 lg:gap-1.5">
            <Button
              size="sm"
              variant="default"
              onClick={handleActionClick}
              className="h-11 gap-1.5 rounded-full px-4 text-xs font-medium shadow-xs lg:h-8 lg:rounded-lg lg:px-3"
            >
              <DownloadIcon className="size-4 lg:size-3.5" data-icon="inline-start" />
              <span className="lg:hidden">Instalar app</span>
              <span className="hidden lg:inline">Instalar</span>
            </Button>
            <button
              type="button"
              onClick={() => dismiss(14)}
              aria-label="Dispensar aviso de instalação"
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:size-8 lg:rounded-lg"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <PwaInstallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

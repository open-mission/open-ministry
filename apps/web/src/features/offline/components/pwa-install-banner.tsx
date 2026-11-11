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
        className="fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 animate-in fade-in slide-in-from-bottom-4 duration-300 md:right-6 md:bottom-6"
      >
        <div className="flex items-center gap-1 rounded-full border border-primary/20 bg-background/95 p-1 pl-1.5 shadow-xl backdrop-blur-md dark:border-primary/30 md:max-w-sm md:gap-3 md:rounded-2xl md:p-3.5">
          <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs md:flex">
            <SmartphoneIcon className="size-5" />
          </div>

          <div className="hidden min-w-0 flex-1 md:block">
            <p className="text-xs font-semibold text-foreground tracking-tight">
              Instale o OpenMinistry
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              Adicione à tela inicial para acesso rápido
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 md:gap-1.5">
            <Button
              size="sm"
              variant="default"
              onClick={handleActionClick}
              className="h-11 gap-1.5 rounded-full px-4 text-xs font-medium shadow-xs md:h-8 md:rounded-lg md:px-3"
            >
              <DownloadIcon className="size-4 md:size-3.5" data-icon="inline-start" />
              <span className="md:hidden">Instalar app</span>
              <span className="hidden md:inline">Instalar</span>
            </Button>
            <button
              type="button"
              onClick={() => dismiss(14)}
              aria-label="Dispensar aviso de instalação"
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:size-8 md:rounded-lg"
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

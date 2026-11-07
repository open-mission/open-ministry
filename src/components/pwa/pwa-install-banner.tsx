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
    // Slight delay to avoid layout shift on initial load
    const timer = setTimeout(() => {
      setMounted(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

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
        className="fixed bottom-20 inset-x-3 z-30 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-6 md:right-6 md:left-auto md:max-w-sm"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-background/95 p-3.5 shadow-xl backdrop-blur-md dark:border-primary/30">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <SmartphoneIcon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground tracking-tight">
              Instale o OpenMinistry
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              Adicione à tela inicial para acesso rápido
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="default"
              onClick={handleActionClick}
              className="h-8 px-3 text-xs rounded-lg font-medium shadow-xs"
            >
              <DownloadIcon className="size-3.5" data-icon="inline-start" />
              Instalar
            </Button>
            <button
              type="button"
              onClick={() => dismiss(14)}
              aria-label="Dispensar aviso de instalação"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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

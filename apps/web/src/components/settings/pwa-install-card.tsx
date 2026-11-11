"use client";

import { useState } from "react";
import { CheckCircle2Icon, SmartphoneIcon, SparklesIcon } from "lucide-react";

import { PwaInstallDialog } from "@/components/pwa/pwa-install-dialog";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PwaInstallCard() {
  const { isStandalone } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SmartphoneIcon className="size-4.5" />
              </span>
              <div>
                <CardTitle className="font-heading text-xl">
                  Aplicativo no Celular (PWA)
                </CardTitle>
                <CardDescription className="text-xs">
                  Acesso rápido e navegação em tela cheia na sua tela de início.
                </CardDescription>
              </div>
            </div>
            {isStandalone ? (
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              >
                <CheckCircle2Icon className="size-3" />
                Instalado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Disponível
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2 text-xs">
            <p className="font-medium text-foreground">
              {isStandalone
                ? "Este dispositivo já está com o aplicativo instalado."
                : "Instale o OpenMinistry diretamente pelo navegador do seu celular."}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              O OpenMinistry é um Progressive Web App (PWA). Você não precisa baixar
              pela App Store ou Google Play para ter uma experiência nativa, sem
              barras de navegação e com alta performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-9 px-4 text-xs"
            >
              <SparklesIcon data-icon="inline-start" className="size-3.5" />
              {isStandalone
                ? "Ver instruções de instalação"
                : "Como instalar no seu celular"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PwaInstallDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

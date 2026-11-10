"use client";

import { useState } from "react";
import {
  AppleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  InfoIcon,
  MoreVerticalIcon,
  PlusSquareIcon,
  SmartphoneIcon,
  SparklesIcon,
  SquareArrowUpIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PwaInstallDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const {
    platform,
    isStandalone,
    canInstallNatively,
    triggerNativeInstall,
  } = usePwaInstall();

  const [activeTab, setActiveTab] = useState<string>(
    platform === "ios" ? "ios" : "android",
  );

  const [installing, setInstalling] = useState(false);

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      const success = await triggerNativeInstall();
      if (success) {
        toast.success("OpenMinistry instalado com sucesso!");
        setOpen(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SmartphoneIcon className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-heading text-2xl tracking-tight">
                Instalar no Celular
              </DialogTitle>
              <DialogDescription className="text-xs">
                Acesse como um aplicativo nativo, direto da sua tela de início.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isStandalone ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-4 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200">
            <div className="flex items-center gap-3">
              <CheckCircle2Icon className="size-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-medium text-sm">
                  Você já está usando o aplicativo instalado!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  O OpenMinistry já está rodando em tela cheia na sua tela de
                  início.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/60">
                <TabsTrigger
                  value="ios"
                  className="gap-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <AppleIcon className="size-4" />
                  iPhone / iPad (iOS)
                </TabsTrigger>
                <TabsTrigger
                  value="android"
                  className="gap-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <SmartphoneIcon className="size-4" />
                  Android / Chrome
                </TabsTrigger>
              </TabsList>

              {/* ABA IOS */}
              <TabsContent value="ios" className="space-y-4 pt-2">
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200 text-xs">
                  <InfoIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p className="leading-relaxed">
                    No iOS, a instalação funciona pelo navegador{" "}
                    <strong>Safari</strong>. Se estiver no Chrome ou outro
                    navegador, abra o link no Safari.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Toque no botão Compartilhar
                        </p>
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                          <SquareArrowUpIcon className="size-4" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Na barra de navegação inferior do Safari, toque no ícone
                        de compartilhamento (um quadrado com uma seta apontando
                        para cima).
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Selecione &ldquo;Adicionar à Tela de Início&rdquo;
                        </p>
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-zinc-500/10 text-foreground">
                          <PlusSquareIcon className="size-4" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Deslize o menu para baixo até encontrar a opção{" "}
                        <span className="font-medium text-foreground">
                          Adicionar à Tela de Início
                        </span>{" "}
                        (marcada com um símbolo de +).
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      3
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Confirme em &ldquo;Adicionar&rdquo;
                        </p>
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2Icon className="size-4" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No canto superior direito da tela, toque em{" "}
                        <strong>Adicionar</strong>. Pronto! O OpenMinistry
                        aparecerá junto aos seus outros aplicativos.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ABA ANDROID */}
              <TabsContent value="android" className="space-y-4 pt-2">
                {canInstallNatively && (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                      <SparklesIcon className="size-4 text-primary" />
                      <span>Instalação rápida disponível</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Seu navegador suporta a instalação direta em um toque.
                    </p>
                    <Button
                      onClick={handleNativeInstall}
                      disabled={installing}
                      className="w-full h-10"
                    >
                      <DownloadIcon data-icon="inline-start" />
                      {installing
                        ? "Instalando aplicativo..."
                        : "Instalar OpenMinistry agora"}
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      1
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Abra o menu do navegador
                        </p>
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-zinc-500/10 text-foreground">
                          <MoreVerticalIcon className="size-4" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No Chrome ou Samsung Internet, toque no menu de três
                        pontinhos verticais (⋮) no topo direito da tela.
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      2
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Toque em &ldquo;Instalar aplicativo&rdquo;
                        </p>
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <DownloadIcon className="size-4" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Escolha a opção{" "}
                        <span className="font-medium text-foreground">
                          &ldquo;Instalar aplicativo&rdquo;
                        </span>{" "}
                        ou{" "}
                        <span className="font-medium text-foreground">
                          &ldquo;Adicionar à tela inicial&rdquo;
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3.5 rounded-xl border bg-card p-3.5 shadow-2xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      3
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Confirme a instalação
                        </p>
                        <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2Icon className="size-4" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Toque em <strong>Instalar</strong> no pop-up de
                        confirmação. O ícone aparecerá na sua gaveta de
                        aplicativos!
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Vantagens */}
            <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                Por que instalar?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-foreground">
                <div className="flex items-center gap-2">
                  <ZapIcon className="size-3.5 text-primary shrink-0" />
                  <span>Abertura instantânea</span>
                </div>
                <div className="flex items-center gap-2">
                  <SmartphoneIcon className="size-3.5 text-primary shrink-0" />
                  <span>Sem barras do navegador</span>
                </div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-3.5 text-primary shrink-0" />
                  <span>Acesso fácil às escalas</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="default" className="w-full sm:w-auto h-10">
              Entendi
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LockIcon,
  RefreshCwIcon,
  Share2Icon,
} from "lucide-react";

import {
  getEventPublicShareInfoAction,
  regenerateEventPublicShareTokenAction,
  toggleEventPublicShareAction,
} from "@/app/actions/events";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

type SharePlanDialogProps = {
  eventId: string;
  eventTitle: string;
  trigger?: React.ReactNode;
};

const REGENERATE_WARNING =
  "Isso invalidará o link compartilhado anteriormente. Pessoas com a URL antiga não conseguirão mais acessar até receberem a nova.";

export function SharePlanDialog({
  eventId,
  eventTitle,
  trigger,
}: SharePlanDialogProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [allowPdf, setAllowPdf] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      getEventPublicShareInfoAction(eventId)
        .then((res) => {
          if (res.ok) {
            setIsEnabled(Boolean(res.isPublicShareEnabled));
            setToken(res.publicShareToken ?? null);
            setAllowPdf(res.publicShareAllowPdf ?? true);
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar dados de compartilhamento", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = token ? `${origin}/share/cronograma/${token}` : "";

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      const res = await toggleEventPublicShareAction({
        eventId,
        enabled: checked,
        allowPdf,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      setIsEnabled(Boolean(res.isPublicShareEnabled));
      if (res.publicShareToken) {
        setToken(res.publicShareToken);
      }
      toast.success(
        checked
          ? "Cronograma publicado com link público!"
          : "Link público desativado.",
      );
    });
  };

  const handleTogglePdf = (checked: boolean) => {
    setAllowPdf(checked);
    startTransition(async () => {
      const res = await toggleEventPublicShareAction({
        eventId,
        enabled: isEnabled,
        allowPdf: checked,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        checked
          ? "Download de PDF ativado para visitantes."
          : "Download de PDF bloqueado para visitantes.",
      );
    });
  };

  const handleRegenerate = () => {
    startTransition(async () => {
      const res = await regenerateEventPublicShareTokenAction(eventId);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      if (res.publicShareToken) {
        setToken(res.publicShareToken);
        toast.success("Novo link gerado! O link anterior foi invalidado.");
      }
    });
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!shareUrl) return;
    const message = `Acompanhe o cronograma de *${eventTitle}* através do link:\n${shareUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  const triggerNode = trigger || (
    <Button variant="outline" size="sm" className="gap-1.5 h-9">
      <Share2Icon className="size-4 text-primary" />
      <span>Compartilhar</span>
    </Button>
  );

  const shareBody = (
    <div className="space-y-5 pt-3">
      {/* Toggle Principal */}
      <div className="flex items-center justify-between gap-3 rounded-xl border p-4 bg-muted/40">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            {isEnabled ? (
              <GlobeIcon className="size-4 text-emerald-500" />
            ) : (
              <LockIcon className="size-4 text-muted-foreground" />
            )}
            Link público de visualização
          </Label>
          <p className="text-xs text-muted-foreground">
            {isEnabled
              ? "Ativo • Qualquer pessoa com o link pode visualizar."
              : "Desativado • O acesso é restrito ao painel."}
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isPending || loading}
        />
      </div>

      {isEnabled && token ? (
        <div className="space-y-4">
          {/* Campo com o Link */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              URL de Visualização
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-xs bg-muted/50"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 gap-1.5 min-h-11"
              >
                {copied ? (
                  <CheckIcon className="size-3.5 text-emerald-600" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs min-h-11"
            >
              <a href={shareUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-3.5" />
                <span>Ver como visitante</span>
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="gap-1.5 text-xs min-h-11 text-emerald-600 hover:text-emerald-700"
            >
              <Share2Icon className="size-3.5" />
              <span>No WhatsApp</span>
            </Button>
          </div>

          {/* Toggle de PDF */}
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium">
                Permitir download do PDF pelo link
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Visitantes poderão baixar o PDF oficial.
              </p>
            </div>
            <Switch
              checked={allowPdf}
              onCheckedChange={handleTogglePdf}
              disabled={isPending}
            />
          </div>

          {/* Regenerar Token */}
          <div className="border-t pt-3 flex justify-between items-center gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">
                Link comprometido?
              </p>
              <p className="text-[11px] text-muted-foreground">
                Gere uma nova URL e cancele a anterior.
              </p>
            </div>

            {isMobile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-foreground min-h-11"
                disabled={isPending}
                onClick={() => setConfirmRegenerateOpen(true)}
              >
                <RefreshCwIcon className="size-3" />
                <span>Regenerar link</span>
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                    disabled={isPending}
                  >
                    <RefreshCwIcon className="size-3" />
                    <span>Regenerar link</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerar link público?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {REGENERATE_WARNING}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerate}
                      disabled={isPending}
                    >
                      Sim, regenerar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  const regenerateConfirmation = isMobile ? (
    <DrawerNestedRoot
      open={confirmRegenerateOpen}
      onOpenChange={setConfirmRegenerateOpen}
    >
      <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
        <DrawerHeader className="text-left! px-5 pt-4 pb-2">
          <DrawerTitle className="font-heading text-lg leading-snug">
            Regenerar link público?
          </DrawerTitle>
          <DrawerDescription className="text-sm leading-relaxed">
            {REGENERATE_WARNING}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={() => {
              setConfirmRegenerateOpen(false);
              handleRegenerate();
            }}
            disabled={isPending}
            className="min-h-11 w-full"
          >
            Sim, regenerar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmRegenerateOpen(false)}
            disabled={isPending}
            className="min-h-11 w-full"
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerNestedRoot>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{triggerNode}</DrawerTrigger>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left! text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="flex items-center justify-start gap-2 font-heading text-xl tracking-tight">
              <Share2Icon className="size-5 text-primary" />
              Compartilhar Cronograma
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground text-left">
              Permita que pessoas fora da plataforma (músicos, visitantes ou
              equipe) acessem o cronograma deste evento via link público.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[85vh] overflow-y-auto px-5 py-4 pb-6 [-webkit-overflow-scrolling:touch]">
            {shareBody}
          </div>

          <DrawerFooter className="border-t pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="min-h-11 w-full">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>

          {regenerateConfirmation}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2Icon className="size-5 text-primary" />
            Compartilhar Cronograma
          </DialogTitle>
          <DialogDescription>
            Permita que pessoas fora da plataforma (músicos, visitantes ou
            equipe) acessem o cronograma deste evento via link público.
          </DialogDescription>
        </DialogHeader>
        {shareBody}
      </DialogContent>
    </Dialog>
  );
}

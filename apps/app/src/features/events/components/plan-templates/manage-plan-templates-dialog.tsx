"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClockIcon,
  FolderOpenIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import {
  applyPlanTemplateAction,
  deletePlanTemplateAction,
  listPlanTemplatesAction,
  type SavedPlanTemplate,
} from "@/app/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ManagePlanTemplatesDialogProps } from "./types";
import { ConfirmReplaceDialog } from "./confirm-replace-dialog";

export function ManagePlanTemplatesDialog({
  eventId,
  open,
  onOpenChange,
  currentItemsCount,
}: ManagePlanTemplatesDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<SavedPlanTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTemplateToApply, setPendingTemplateToApply] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadTemplates() {
    setIsLoading(true);
    const res = await listPlanTemplatesAction();
    if (res.ok && res.templates) {
      setTemplates(res.templates);
    }
    setIsLoading(false);
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
    if (isOpen) {
      loadTemplates();
    }
  }

  function handleSelectApply(template: { id: string; name: string }) {
    if (currentItemsCount > 0) {
      setPendingTemplateToApply(template);
      setConfirmReplaceOpen(true);
    } else {
      executeApply(template.id, template.name);
    }
  }

  function executeApply(templateId: string, templateName: string) {
    startTransition(async () => {
      const res = await applyPlanTemplateAction(eventId, templateId);
      if (res.ok) {
        toast.success(`Modelo "${templateName}" aplicado com sucesso!`);
        setConfirmReplaceOpen(false);
        setPendingTemplateToApply(null);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao aplicar modelo.");
      }
    });
  }

  function handleDeleteTemplate(templateId: string, templateName: string) {
    setDeletingId(templateId);
    startTransition(async () => {
      const res = await deletePlanTemplateAction(templateId);
      if (res.ok) {
        toast.success(`Modelo "${templateName}" removido.`);
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } else {
        toast.error(res.error || "Erro ao excluir modelo.");
      }
      setDeletingId(null);
    });
  }

  const templatesBody = (
    <div className="space-y-4">
      {/* Starter Template */}
      <div className="rounded-xl border bg-card p-4 transition-all hover:border-primary/50 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SparklesIcon className="size-4 text-amber-500" />
              <span className="font-heading text-sm font-semibold text-foreground">
                Modelo Padrão de Culto
              </span>
              <Badge variant="secondary" className="text-[11px]">
                Padrão do Sistema
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estrutura clássica de culto: Abertura, Louvor, Avisos, Ofertas,
              Palavra e Bênção Apostólica (~65 min).
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              handleSelectApply({
                id: "starter",
                name: "Modelo Padrão de Culto",
              })
            }
            className="gap-1.5 shrink-0 min-h-11 sm:min-h-0"
          >
            <FolderOpenIcon className="size-3.5" />
            Aplicar
          </Button>
        </div>
      </div>

      {/* Custom Church Templates */}
      <div className="space-y-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Modelos da sua igreja ({templates.length})
        </span>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin mr-2" />
            Carregando modelos salvos...
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
            Nenhum modelo personalizado salvo ainda. Crie um cronograma e clique
            em &ldquo;Salvar como modelo&rdquo;.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tmpl) => {
              const totalSecs = (tmpl.items || []).reduce(
                (acc, cur) => acc + (cur.durationSeconds || 0),
                0,
              );
              const totalMin = Math.round(totalSecs / 60);

              return (
                <div
                  key={tmpl.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 shadow-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {tmpl.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px]"
                      >
                        {(tmpl.items || []).length} momentos
                      </Badge>
                      {totalMin > 0 ? (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <ClockIcon className="size-3" />~{totalMin} min
                        </span>
                      ) : null}
                    </div>
                    {tmpl.description ? (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {tmpl.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        handleSelectApply({
                          id: tmpl.id,
                          name: tmpl.name,
                        })
                      }
                      className="gap-1 min-h-11 sm:min-h-0"
                    >
                      <FolderOpenIcon className="size-3.5" />
                      Aplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={deletingId === tmpl.id || isPending}
                      onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                      className="size-11 sm:size-7 text-muted-foreground hover:text-destructive"
                      title="Excluir modelo"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const replaceDescription = (
    <>
      <span className="block">
        Este evento já possui{" "}
        <strong className="text-foreground">
          {currentItemsCount} {currentItemsCount === 1 ? "momento" : "momentos"}
        </strong>{" "}
        no cronograma.
      </span>
      <span className="block">
        Aplicar o modelo &ldquo;{pendingTemplateToApply?.name}&rdquo; irá{" "}
        <strong className="text-foreground">
          apagar todos os momentos atuais
        </strong>{" "}
        e substituí-los pela nova programação. Esta ação não pode ser desfeita.
      </span>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="flex max-h-[85vh] flex-col p-0">
            <DrawerHeader className="shrink-0 border-b px-5 pt-4 pb-3 text-left! text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle className="font-heading text-xl tracking-tight">
                Modelos de Cronograma
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground text-left">
                Selecione um modelo pronto para preencher a programação deste
                evento.
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [-webkit-overflow-scrolling:touch]">
              {templatesBody}
            </div>

            <DrawerFooter className="shrink-0 border-t bg-background pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="min-h-11 w-full"
              >
                Fechar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <ConfirmReplaceDialog
          open={confirmReplaceOpen}
          onOpenChange={setConfirmReplaceOpen}
          isMobile={isMobile}
          isPending={isPending}
          description={replaceDescription}
          onConfirm={() => {
            if (pendingTemplateToApply) {
              executeApply(
                pendingTemplateToApply.id,
                pendingTemplateToApply.name,
              );
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
              <LayoutTemplateIcon className="size-5" />
            </div>
            <DialogTitle>Modelos de Cronograma</DialogTitle>
            <DialogDescription>
              Selecione um modelo pronto para preencher a programação deste
              evento.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            {templatesBody}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmReplaceDialog
        open={confirmReplaceOpen}
        onOpenChange={setConfirmReplaceOpen}
        isMobile={isMobile}
        isPending={isPending}
        description={replaceDescription}
        onConfirm={() => {
          if (pendingTemplateToApply) {
            executeApply(
              pendingTemplateToApply.id,
              pendingTemplateToApply.name,
            );
          }
        }}
      />
    </>
  );
}

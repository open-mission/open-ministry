"use client";

import { useState, useTransition, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookmarkPlusIcon,
  CheckIcon,
  ClockIcon,
  FolderOpenIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import {
  applyPlanTemplateAction,
  clearEventPlanAction,
  deletePlanTemplateAction,
  importPlanItemsAction,
  listPlanTemplatesAction,
  savePlanAsTemplateAction,
  type SavedPlanTemplate,
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
} from "@/components/ui/alert-dialog";
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
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanTemplateItem } from "@/db/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ComputedPlanItem } from "@/lib/plan-utils";

type SavePlanDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsCount: number;
  totalDurationSeconds: number;
};

export function SavePlanDialog({
  eventId,
  open,
  onOpenChange,
  itemsCount,
  totalDurationSeconds,
}: SavePlanDialogProps) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const durationMin = Math.round(totalDurationSeconds / 60);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para o modelo.");
      return;
    }

    startTransition(async () => {
      const res = await savePlanAsTemplateAction(eventId, name, description);
      if (res.ok) {
        toast.success(`Modelo "${name.trim()}" salvo com sucesso!`);
        setName("");
        setDescription("");
        onOpenChange(false);
      } else {
        toast.error(res.error || "Erro ao salvar modelo.");
      }
    });
  }

  const fields = (
    <>
      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center justify-between font-medium text-foreground">
          <span>Conteúdo a ser salvo:</span>
          <Badge variant="outline" className="font-mono text-[11px]">
            {itemsCount} {itemsCount === 1 ? "momento" : "momentos"}
          </Badge>
        </div>
        <p>Duração estimada: ~{durationMin} minutos planejados</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-name">Nome do modelo *</Label>
        <Input
          id="template-name"
          placeholder="Ex.: Culto de Domingo Noturno"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus={!isMobile}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-desc">Descrição (opcional)</Label>
        <Textarea
          id="template-desc"
          placeholder="Ex.: Estrutura com 4 louvores, ceia e apelo..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="font-heading text-xl tracking-tight">
              Salvar como modelo de culto
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground text-left">
              Salve este cronograma como um modelo reutilizável para futuros
              cultos e eventos da sua igreja.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="max-h-[85vh] flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-8 [-webkit-overflow-scrolling:touch]">
              {fields}
            </div>
            <DrawerFooter className="shrink-0 border-t bg-background pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="submit"
                disabled={isPending}
                className="min-h-11 w-full gap-2"
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                Salvar modelo
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
                className="min-h-11 w-full"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
            <BookmarkPlusIcon className="size-5" />
          </div>
          <DialogTitle>Salvar como modelo de culto</DialogTitle>
          <DialogDescription>
            Salve este cronograma como um modelo reutilizável para futuros
            cultos e eventos da sua igreja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {fields}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Salvar modelo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ManagePlanTemplatesDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItemsCount: number;
};

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

  // Load templates when dialog opens
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

  const replaceConfirmation = isMobile ? (
    <DrawerNestedRoot
      open={confirmReplaceOpen}
      onOpenChange={setConfirmReplaceOpen}
    >
      <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
        <DrawerHeader className="!text-left px-5 pt-4 pb-2">
          <DrawerTitle className="font-heading text-lg leading-snug text-destructive">
            Substituir cronograma existente?
          </DrawerTitle>
          <DrawerDescription className="space-y-2 text-sm leading-relaxed">
            {replaceDescription}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (pendingTemplateToApply) {
                executeApply(
                  pendingTemplateToApply.id,
                  pendingTemplateToApply.name,
                );
              }
            }}
            className="min-h-11 w-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Substituir e aplicar modelo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmReplaceOpen(false)}
            className="min-h-11 w-full"
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerNestedRoot>
  ) : (
    <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Substituir cronograma existente?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {replaceDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              if (pendingTemplateToApply) {
                executeApply(
                  pendingTemplateToApply.id,
                  pendingTemplateToApply.name,
                );
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Substituir e aplicar modelo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="flex max-h-[85vh] flex-col p-0">
            <DrawerHeader className="shrink-0 border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
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

            {replaceConfirmation}
          </DrawerContent>
        </Drawer>
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

      {replaceConfirmation}
    </>
  );
}

type ClearPlanDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsCount: number;
};

export function ClearPlanDialog({
  eventId,
  open,
  onOpenChange,
  itemsCount,
}: ClearPlanDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();

  function handleClear() {
    startTransition(async () => {
      const res = await clearEventPlanAction(eventId);
      if (res.ok) {
        toast.success("Cronograma limpo com sucesso!");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao limpar cronograma.");
      }
    });
  }

  const description = (
    <>
      <span className="block">
        Você está prestes a remover todos os{" "}
        <strong className="text-foreground">{itemsCount} momentos</strong> e
        seções deste culto.
      </span>
      <span className="block">
        O cronograma voltará ao estado em branco. Deseja continuar?
      </span>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
          <DrawerHeader className="!text-left px-5 pt-4 pb-2">
            <DrawerTitle className="font-heading text-lg leading-snug text-destructive">
              Limpar todo o cronograma?
            </DrawerTitle>
            <DrawerDescription className="space-y-2 text-sm leading-relaxed">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              disabled={isPending}
              onClick={handleClear}
              className="min-h-11 w-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
              Sim, limpar cronograma
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="min-h-11 w-full"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Limpar todo o cronograma?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleClear}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <Trash2Icon className="size-4" />
            )}
            Sim, limpar cronograma
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Export and Import helpers
export function exportPlanAsJson(
  eventTitle: string,
  items: ComputedPlanItem[],
) {
  if (items.length === 0) {
    toast.error("Não há momentos para exportar.");
    return;
  }

  const exportPayload = {
    openMinistryPlanVersion: 1,
    title: eventTitle,
    exportedAt: new Date().toISOString(),
    itemsCount: items.length,
    items: items.map((item, index) => ({
      type: item.type === "header" ? "header" : "item",
      title: item.title,
      description: item.description ?? null,
      durationSeconds: item.durationSeconds ?? 0,
      order: index,
      customResponsible:
        item.customResponsible ?? (item.person?.name || null),
    })),
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportPayload, null, 2),
  )}`;
  const downloadAnchor = document.createElement("a");
  const fileName = `cronograma-${eventTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${new Date().toISOString().slice(0, 10)}.json`;

  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  toast.success("Cronograma exportado como arquivo JSON!");
}

type ImportPlanDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItemsCount: number;
};

export function ImportPlanDialog({
  eventId,
  open,
  onOpenChange,
  currentItemsCount,
}: ImportPlanDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedItems, setParsedItems] = useState<PlanTemplateItem[] | null>(
    null,
  );
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        let itemsRaw: unknown[] = [];
        if (Array.isArray(json)) {
          itemsRaw = json;
        } else if (json && Array.isArray(json.items)) {
          itemsRaw = json.items;
        } else {
          toast.error("Formato inválido. O arquivo JSON deve conter uma lista de itens.");
          return;
        }

        const validItems: PlanTemplateItem[] = [];
        for (let i = 0; i < itemsRaw.length; i++) {
          const row = itemsRaw[i] as Record<string, unknown>;
          if (!row || typeof row.title !== "string" || !row.title.trim()) {
            continue;
          }
          validItems.push({
            type: row.type === "header" ? "header" : "item",
            title: row.title.trim(),
            description: typeof row.description === "string" ? row.description : null,
            durationSeconds:
              typeof row.durationSeconds === "number" && row.durationSeconds >= 0
                ? Math.round(row.durationSeconds)
                : 0,
            order: i,
            customResponsible:
              typeof row.customResponsible === "string" ? row.customResponsible : null,
          });
        }

        if (validItems.length === 0) {
          toast.error("Nenhum momento válido encontrado no arquivo.");
          return;
        }

        setParsedItems(validItems);

        if (currentItemsCount > 0) {
          setConfirmReplaceOpen(true);
        } else {
          executeImport(validItems);
        }
      } catch (err) {
        console.error("Erro ao ler JSON", err);
        toast.error("Não foi possível processar o arquivo JSON.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  function executeImport(items: PlanTemplateItem[]) {
    startTransition(async () => {
      const res = await importPlanItemsAction(eventId, items);
      if (res.ok) {
        toast.success(`${items.length} momentos importados com sucesso!`);
        setParsedItems(null);
        setConfirmReplaceOpen(false);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao importar momentos.");
      }
    });
  }

  const dropzone = (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/30 min-h-11"
    >
      <UploadIcon className="size-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-foreground">
        Clique para selecionar o arquivo .json
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Suporta exportações oficiais do OpenMinistry
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );

  const replaceDescription = (
    <>
      <span className="block">
        Este culto já possui{" "}
        <strong className="text-foreground">
          {currentItemsCount} {currentItemsCount === 1 ? "momento" : "momentos"}
        </strong>{" "}
        no cronograma.
      </span>
      <span className="block">
        Importar o arquivo com{" "}
        <strong className="text-foreground">
          {parsedItems?.length} novos momentos
        </strong>{" "}
        irá{" "}
        <strong className="text-foreground">
          substituir todos os itens atuais
        </strong>
        . Esta ação não pode ser desfeita.
      </span>
    </>
  );

  const replaceConfirmation = isMobile ? (
    <DrawerNestedRoot
      open={confirmReplaceOpen}
      onOpenChange={setConfirmReplaceOpen}
    >
      <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
        <DrawerHeader className="!text-left px-5 pt-4 pb-2">
          <DrawerTitle className="font-heading text-lg leading-snug text-destructive">
            Substituir cronograma existente?
          </DrawerTitle>
          <DrawerDescription className="space-y-2 text-sm leading-relaxed">
            {replaceDescription}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (parsedItems) executeImport(parsedItems);
            }}
            className="min-h-11 w-full gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Substituir e importar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmReplaceOpen(false)}
            className="min-h-11 w-full"
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerNestedRoot>
  ) : (
    <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Substituir cronograma existente?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {replaceDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              if (parsedItems) executeImport(parsedItems);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Substituir e importar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="p-0">
            <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle className="font-heading text-xl tracking-tight">
                Importar cronograma de arquivo
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground text-left">
                Carregue um arquivo JSON exportado previamente para preencher a
                programação deste culto.
              </DrawerDescription>
            </DrawerHeader>

            <div className="max-h-[85vh] overflow-y-auto px-5 py-4 pb-8 [-webkit-overflow-scrolling:touch]">
              {dropzone}
            </div>

            <DrawerFooter className="border-t pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="min-h-11 w-full"
              >
                Cancelar
              </Button>
            </DrawerFooter>

            {replaceConfirmation}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
              <UploadIcon className="size-5" />
            </div>
            <DialogTitle>Importar cronograma de arquivo</DialogTitle>
            <DialogDescription>
              Carregue um arquivo JSON exportado previamente para preencher a
              programação deste culto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">{dropzone}</div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {replaceConfirmation}
    </>
  );
}

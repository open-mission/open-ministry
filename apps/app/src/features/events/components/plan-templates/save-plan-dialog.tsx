"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { BookmarkPlusIcon, CheckIcon, Loader2Icon } from "lucide-react";

import { savePlanAsTemplateAction } from "@/app/actions/events";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SavePlanDialogProps } from "./types";

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

  function handleSave(e: FormEvent) {
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
          <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left! text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
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

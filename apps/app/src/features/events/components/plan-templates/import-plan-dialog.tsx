"use client";

import { useState, useTransition, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";

import { importPlanItemsAction } from "@/app/actions/events";
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
import type { PlanTemplateItem } from "@/db/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ImportPlanDialogProps } from "./types";
import { ConfirmReplaceDialog } from "./confirm-replace-dialog";

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

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="p-0">
            <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left! text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
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
          </DrawerContent>
        </Drawer>

        <ConfirmReplaceDialog
          open={confirmReplaceOpen}
          onOpenChange={setConfirmReplaceOpen}
          isMobile={isMobile}
          isPending={isPending}
          description={replaceDescription}
          onConfirm={() => {
            if (parsedItems) executeImport(parsedItems);
          }}
        />
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

      <ConfirmReplaceDialog
        open={confirmReplaceOpen}
        onOpenChange={setConfirmReplaceOpen}
        isMobile={isMobile}
        isPending={isPending}
        description={replaceDescription}
        onConfirm={() => {
          if (parsedItems) executeImport(parsedItems);
        }}
      />
    </>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { clearEventPlanAction } from "@/app/actions/events";
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
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClearPlanDialogProps } from "./types";

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
            <DrawerDescription className="space-y-2 text-sm leading-relaxed text-left">
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

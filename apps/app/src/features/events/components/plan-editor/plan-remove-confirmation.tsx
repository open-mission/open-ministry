"use client";

import { Trash2Icon } from "lucide-react";

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
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";

type RemoveDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  onConfirm: () => void;
};

/** Versão mobile: botão + bottom-sheet aninhado no Drawer de edição. */
export function PlanRemoveDrawer({
  open,
  onOpenChange,
  itemTitle,
  onConfirm,
}: RemoveDrawerProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onOpenChange(true)}
        className="text-muted-foreground hover:text-destructive"
        title="Remover"
        aria-label={`Remover ${itemTitle}`}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
      <DrawerNestedRoot open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
          <DrawerHeader className="text-left! px-5 pt-4 pb-2">
            <DrawerTitle className="font-heading text-lg leading-snug">
              Remover momento?
            </DrawerTitle>
            <DrawerDescription className="text-sm leading-relaxed">
              Tem certeza que deseja remover &ldquo;{itemTitle}
              &rdquo; do cronograma?
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onOpenChange(false);
                onConfirm();
              }}
              className="min-h-11 w-full"
            >
              Remover
            </Button>
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
      </DrawerNestedRoot>
    </>
  );
}

/** Versão desktop: botão que abre o AlertDialog de confirmação. */
export function PlanRemoveAlert({
  itemTitle,
  onConfirm,
}: {
  itemTitle: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          title="Remover"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover momento?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover &ldquo;{itemTitle}&rdquo; do
            cronograma?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

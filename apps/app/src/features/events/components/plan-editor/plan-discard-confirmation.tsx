"use client";

import { CheckIcon } from "lucide-react";

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

type PlanDiscardConfirmationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  isPending: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function PlanDiscardConfirmation({
  open,
  onOpenChange,
  isMobile,
  isPending,
  onSave,
  onDiscard,
}: PlanDiscardConfirmationProps) {
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
          <DrawerHeader className="!text-left px-5 pt-4 pb-2">
            <DrawerTitle className="font-heading text-lg leading-snug">
              Descartar alterações?
            </DrawerTitle>
            <DrawerDescription className="text-sm leading-relaxed">
              Você possui alterações na ordem dos momentos do cronograma que
              ainda não foram salvas.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="min-h-11 w-full"
            >
              <CheckIcon className="size-4" />
              Salvar agora
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onDiscard}
              className="min-h-11 w-full text-destructive hover:bg-destructive/10"
            >
              Descartar alterações
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-h-11 w-full"
            >
              Continuar editando
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
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            Você possui alterações na ordem dos momentos do cronograma que ainda
            não foram salvas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={onDiscard}
            className="text-destructive hover:bg-destructive/10"
          >
            Descartar alterações
          </Button>
          <AlertDialogAction onClick={onSave} disabled={isPending}>
            Salvar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

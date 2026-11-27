"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import * as React from "react";

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
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";

type ConfirmReplaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  isPending: boolean;
  onConfirm: () => void;
  description: React.ReactNode;
};

export function ConfirmReplaceDialog({
  open,
  onOpenChange,
  isMobile,
  isPending,
  onConfirm,
  description,
}: ConfirmReplaceDialogProps) {
  if (isMobile) {
    return (
      <DrawerNestedRoot open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] p-0" role="alertdialog">
          <DrawerHeader className="!text-left px-5 pt-4 pb-2">
            <DrawerTitle className="font-heading text-lg leading-snug text-destructive">
              Substituir cronograma existente?
            </DrawerTitle>
            <DrawerDescription className="space-y-2 text-sm leading-relaxed text-left">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
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
              onClick={() => onOpenChange(false)}
              className="min-h-11 w-full"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </DrawerNestedRoot>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Substituir cronograma existente?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
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
}

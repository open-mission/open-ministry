"use client";

import * as React from "react";
import { Loader2Icon, LogOutIcon } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import {
  AlertDialog,
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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignOutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutConfirmDialog({
  open,
  onOpenChange,
}: SignOutConfirmDialogProps) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await signOutAction(formData);
    });
  }

  // Mobile Experience: Drawer sliding from the bottom
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="flex flex-col items-center text-center pt-4">
            <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <LogOutIcon className="size-6" />
            </span>
            <DrawerTitle className="text-lg font-semibold">
              Encerrar sessão?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground max-w-xs mt-1 text-center">
              Você precisará fazer login novamente para acessar o painel e os dados da sua igreja.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex flex-col gap-2.5 pt-4">
            <form action={handleSubmit} className="w-full">
              <input type="hidden" name="redirectTo" value="/" />
              <Button
                type="submit"
                variant="destructive"
                size="lg"
                disabled={isPending}
                className="w-full h-12 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin mr-2" />
                    Saindo...
                  </>
                ) : (
                  <>
                    <LogOutIcon className="size-4 mr-2" />
                    Sair da conta
                  </>
                )}
              </Button>
            </form>
            <DrawerClose asChild>
              <Button
                variant="outline"
                size="lg"
                disabled={isPending}
                className="w-full h-12 rounded-xl text-sm font-medium cursor-pointer"
              >
                Continuar conectado
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Experience: Shadcn UI AlertDialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <LogOutIcon className="size-5" />
            </span>
            <div>
              <AlertDialogTitle className="text-base font-semibold">
                Encerrar sessão?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                Deseja realmente sair da sua conta no OpenMinistry?
              </AlertDialogDescription>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Você precisará informar seu e-mail e senha novamente para acessar suas escalas e cultos.
          </p>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={isPending}
            className="h-10 rounded-lg text-xs font-medium cursor-pointer"
          >
            Cancelar
          </AlertDialogCancel>
          <form action={handleSubmit}>
            <input type="hidden" name="redirectTo" value="/" />
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="h-10 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                  Saindo...
                </>
              ) : (
                <>
                  <LogOutIcon className="size-3.5 mr-1.5" />
                  Sair da conta
                </>
              )}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

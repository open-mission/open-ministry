"use client";

import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type ResponsiveAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  pending?: boolean;
  onConfirm: () => void;
};

/**
 * Confirmação solene responsiva: AlertDialog no desktop, Drawer no mobile.
 * Sempre interrompe a ação para que decisões de liderança e acesso não
 * aconteçam por um toque acidental.
 */
export function ResponsiveAlertDialog({
  open,
  onOpenChange,
  trigger,
  icon,
  iconClassName,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmVariant = "default",
  pending = false,
  onConfirm,
}: ResponsiveAlertDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85vh]" role="alertdialog">
          <DrawerHeader className="text-left!">
            <div className="flex items-start gap-3">
              {icon ? (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                    iconClassName,
                  )}
                >
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 space-y-1">
                <DrawerTitle className="font-heading text-lg leading-snug">
                  {title}
                </DrawerTitle>
                <DrawerDescription className="leading-relaxed">
                  {description}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <DrawerFooter className="pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={pending}
              className="min-h-11 w-full"
            >
              {confirmLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              className="min-h-11 w-full"
            >
              {cancelLabel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          {icon ? (
            <AlertDialogMedia className={iconClassName}>
              {icon}
            </AlertDialogMedia>
          ) : null}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

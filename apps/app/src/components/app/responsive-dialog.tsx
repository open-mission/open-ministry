"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type ResponsiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  titleClassName?: string;
  contentClassName?: string;
  bodyClassName?: string;
};

/**
 * Formulário e painel de detalhes acessível: Dialog centralizado no desktop,
 * Drawer em bottom-sheet no mobile. O corpo nunca ultrapassa 85vh e rola
 * internamente, mantendo o cabeçalho e o rodapé visíveis.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  titleClassName,
  contentClassName,
  bodyClassName,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const titleStyles = cn(
    "font-heading text-xl leading-tight tracking-tight sm:text-2xl",
    titleClassName,
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
        <DrawerContent className="flex max-h-[85vh] flex-col">
          <DrawerHeader className="shrink-0 !text-left">
            <DrawerTitle className={titleStyles}>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-4 pb-4 [-webkit-overflow-scrolling:touch]",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <DrawerFooter className="shrink-0 border-t bg-background pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </DrawerFooter>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(
          "max-h-[85vh] overflow-y-auto sm:max-w-md",
          contentClassName,
        )}
      >
        <DialogHeader>
          <DialogTitle className={titleStyles}>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className={bodyClassName}>{children}</div>

        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  HistoryIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type PastEventsSheetProps = {
  count: number;
  children: React.ReactNode;
};

export function PastEventsSheet({ count, children }: PastEventsSheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="group inline-flex items-center gap-1.5 rounded-xl border-border/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-primary sm:text-sm"
    >
      <HistoryIcon className="size-4 text-primary transition-transform group-hover:rotate-[-20deg]" />
      <span>Histórico</span>
      {count > 0 && (
        <Badge
          variant="secondary"
          className="rounded-full px-1.5 py-0 text-[10px] font-semibold tracking-tight"
        >
          {count}
        </Badge>
      )}
      <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="flex max-h-[88dvh] h-[88dvh] flex-col rounded-t-[28px] p-0">
          <DrawerHeader className="border-b border-border/70 px-5 pt-4 pb-3 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HistoryIcon className="size-4" />
              </span>
              <div>
                <DrawerTitle className="font-heading text-lg font-bold tracking-tight">
                  Histórico de encontros
                </DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground">
                  {count === 1
                    ? "1 encontro já aconteceu"
                    : `${count} encontros já aconteceram`}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center">
                <CalendarDaysIcon className="size-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">
                  Nenhum encontro anterior
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Os cultos e eventos que já aconteceram ficarão arquivados aqui.
                </p>
              </div>
            ) : (
              children
            )}
          </div>

          <DrawerFooter className="border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-10 rounded-xl">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full flex-col p-0 data-[side=right]:w-3/4 data-[side=right]:sm:w-3/4 data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HistoryIcon className="size-5" />
            </span>
            <div>
              <SheetTitle className="font-heading text-xl font-bold tracking-tight">
                Histórico de encontros
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {count === 1
                  ? "1 encontro realizado no histórico"
                  : `${count} encontros realizados no histórico`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center">
              <CalendarDaysIcon className="size-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">
                Nenhum encontro anterior
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Os cultos e eventos que já aconteceram ficarão arquivados aqui.
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

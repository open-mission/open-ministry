"use client";

import { useState } from "react";
import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

export interface PageInfoProps {
  title: string;
  description: React.ReactNode;
  triggerLabel?: string;
  className?: string;
}

export function PageInfo({
  title,
  description,
  triggerLabel = "Info",
  className,
}: PageInfoProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/60 px-2 py-0.5 text-xs font-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
          className
        )}
        aria-label={`Informações sobre ${title}`}
        title={`Informações sobre ${title}`}
      >
        <InfoIcon className="size-3" />
        <span>{triggerLabel}</span>
      </button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="p-4 sm:p-6">
            <DrawerHeader className="text-left px-0 pt-0 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <InfoIcon className="size-4" />
                </div>
                <div>
                  <DrawerTitle className="text-base font-semibold">
                    {title}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs">
                    Sobre esta página
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
              {description}
            </div>
            <DrawerFooter className="px-0 pt-4 pb-2">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Entendi
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <InfoIcon className="size-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Sobre esta página
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
              {description}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Entendi
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

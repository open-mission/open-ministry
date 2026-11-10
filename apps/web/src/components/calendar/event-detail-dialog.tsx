"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDaysIcon,
  CalendarX2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  UserCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarItem } from "@/lib/calendar";

type EventDetailDialogProps = {
  item: CalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EventDetailDialog({
  item,
  open,
  onOpenChange,
}: EventDetailDialogProps) {
  const isMobile = useIsMobile();

  if (!item) return null;

  const startDate = parseISO(item.startsAt);
  const endDate = parseISO(item.endsAt);

  const formattedDate = format(
    startDate,
    "EEEE, dd 'de' MMMM 'de' yyyy",
    { locale: ptBR },
  );

  const formattedTime = item.allDay
    ? "O dia todo"
    : `${format(startDate, "HH:mm")} às ${format(endDate, "HH:mm")}`;

  const badgeContent = (
    <>
      {item.type === "assignment" && (
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-medium">
          <UserCheckIcon className="size-3 mr-1" />
          Minha Escala
        </Badge>
      )}
      {item.type === "event" && (
        <Badge variant="secondary" className="font-medium">
          <CalendarDaysIcon className="size-3 mr-1 text-primary" />
          Culto / Evento
        </Badge>
      )}
      {item.type === "unavailability" && (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-medium">
          <CalendarX2Icon className="size-3 mr-1" />
          Indisponível
        </Badge>
      )}
    </>
  );

  const bodyContent = (
    <div className="space-y-3.5 py-2 text-sm">
      {/* Date & Time */}
      <div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
        <ClockIcon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-medium capitalize text-foreground">
            {formattedDate}
          </p>
          <p className="text-xs text-muted-foreground">{formattedTime}</p>
        </div>
      </div>

      {/* Location */}
      {item.location ? (
        <div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3">
          <MapPinIcon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Local</p>
            <p className="text-xs text-muted-foreground">{item.location}</p>
          </div>
        </div>
      ) : null}

      {/* Description / Notes */}
      {item.description ? (
        <div className="rounded-lg border bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Observações:</p>
          <p>{item.description}</p>
        </div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
          <DrawerHeader className="px-5 pt-1 pb-2 text-left">
            <div className="flex items-center gap-2 mb-1.5">
              {badgeContent}
            </div>
            <DrawerTitle className="font-heading text-xl tracking-tight text-foreground">
              {item.title}
            </DrawerTitle>
            {item.subtitle ? (
              <DrawerDescription className="text-sm font-medium text-foreground/80">
                {item.subtitle}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>

          <div className="px-5 overflow-y-auto max-h-[60vh]">
            {bodyContent}
          </div>

          <DrawerFooter className="gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            {item.href ? (
              <Button asChild className="gap-1.5 w-full h-10 font-semibold">
                <Link href={item.href}>
                  <ExternalLinkIcon className="size-3.5" />
                  {item.type === "unavailability"
                    ? "Gerenciar ausências"
                    : "Acessar culto"}
                </Link>
              </Button>
            ) : null}

            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-10">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {badgeContent}
          </div>

          <DialogTitle className="font-heading text-xl tracking-tight text-foreground">
            {item.title}
          </DialogTitle>

          {item.subtitle ? (
            <DialogDescription className="text-sm font-medium text-foreground/80">
              {item.subtitle}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {bodyContent}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>

          {item.href ? (
            <Button asChild className="gap-1.5">
              <Link href={item.href}>
                <ExternalLinkIcon className="size-3.5" />
                {item.type === "unavailability"
                  ? "Gerenciar ausências"
                  : "Acessar culto"}
              </Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

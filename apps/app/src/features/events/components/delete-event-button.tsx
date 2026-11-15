"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteEventAction } from "@/app/actions/events";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useIsMobile } from "@/hooks/use-mobile";

export function DeleteEventButton({
  eventId,
  eventTitle,
  seriesId,
  seriesOccurrences = 0,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  eventId: string;
  eventTitle: string;
  seriesId: string | null;
  seriesOccurrences?: number;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [scope, setScope] = useState<"single" | "series">("single");
  const [pending, startTransition] = useTransition();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (setControlledOpen ?? (() => {})) : setUncontrolledOpen;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEventAction(eventId, scope);

      if (result.ok) {
        toast.success("Evento excluído.");
        router.push("/dashboard/events");
        return;
      }

      toast.error(result.error ?? "Não foi possível excluir o evento.");
    });
  }

  const triggerNode =
    trigger !== undefined
      ? trigger
      : (
          <Button variant="ghost" size="sm" className="text-destructive">
            <Trash2Icon data-icon="inline-start" />
            Excluir
          </Button>
        );

  const title =
    scope === "series"
      ? seriesOccurrences > 0
        ? `Excluir ${seriesOccurrences} ocorrências?`
        : "Excluir esta série?"
      : `Excluir ${eventTitle}?`;

  const description =
    scope === "series"
      ? `${
          seriesOccurrences > 0
            ? `Todas as ${seriesOccurrences} ocorrências`
            : "Todas as ocorrências"
        } desta série serão removidas, inclusive as que já aconteceram, junto com as escalas e o cronograma. Essa ação não pode ser desfeita.`
      : "A escala, o cronograma e as atribuições desta ocorrência serão removidos. Essa ação não pode ser desfeita.";

  const confirmLabel =
    scope === "series" && seriesId
      ? seriesOccurrences > 0
        ? `Excluir ${seriesOccurrences} ocorrências`
        : "Excluir série"
      : seriesId
        ? "Excluir esta ocorrência"
        : "Excluir evento";

  const scopeSelector = seriesId ? (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">O que excluir</p>
      <NativeSelect
        value={scope}
        onChange={(event) => setScope(event.target.value as "single" | "series")}
        className="w-full [&_select]:h-10"
        aria-label="Alcance da exclusão"
      >
        <NativeSelectOption value="single">
          Só esta ocorrência
        </NativeSelectOption>
        <NativeSelectOption value="series">
          Todas as ocorrências desta série
        </NativeSelectOption>
      </NativeSelect>
      {scope === "series" ? (
        <p className="text-xs text-muted-foreground">
          Todas as datas da série serão removidas, inclusive as que já
          aconteceram.
        </p>
      ) : null}
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {triggerNode ? <DrawerTrigger asChild>{triggerNode}</DrawerTrigger> : null}
        <DrawerContent className="p-0" role="alertdialog">
          <DrawerHeader className="!text-left px-5 pt-4 pb-2">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              >
                <Trash2Icon className="size-5" />
              </span>
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

          {scopeSelector ? (
            <div className="px-5 pt-2 pb-1">{scopeSelector}</div>
          ) : null}

          <DrawerFooter className="pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
              className="min-h-11 w-full"
            >
              {confirmLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="min-h-11 w-full"
            >
              Manter evento
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {triggerNode ? (
        <AlertDialogTrigger asChild>{triggerNode}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {scopeSelector}

        <AlertDialogFooter>
          <AlertDialogCancel>Manter evento</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

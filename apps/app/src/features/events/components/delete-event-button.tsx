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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

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

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null
      ) : (
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive">
            <Trash2Icon data-icon="inline-start" />
            Excluir
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {scope === "series"
              ? seriesOccurrences > 0
                ? `Excluir ${seriesOccurrences} ocorrências?`
                : "Excluir esta série?"
              : `Excluir ${eventTitle}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {scope === "series"
              ? `${
                  seriesOccurrences > 0
                    ? `Todas as ${seriesOccurrences} ocorrências`
                    : "Todas as ocorrências"
                } desta série serão removidas, inclusive as que já aconteceram, junto com as escalas e o cronograma. Essa ação não pode ser desfeita.`
              : "A escala, o cronograma e as atribuições desta ocorrência serão removidos. Essa ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {seriesId ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">O que excluir</p>
            <NativeSelect
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as "single" | "series")
              }
              className="w-full [&_select]:h-9"
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
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Manter evento</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {scope === "series" && seriesId
              ? seriesOccurrences > 0
                ? `Excluir ${seriesOccurrences} ocorrências`
                : "Excluir série"
              : seriesId
                ? "Excluir esta ocorrência"
                : "Excluir evento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

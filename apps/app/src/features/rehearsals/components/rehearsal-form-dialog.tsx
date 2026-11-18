"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRingIcon, CalendarClockIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createRehearsalAction,
  updateRehearsalAction,
} from "@/app/actions/rehearsals";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RehearsalSetlist } from "@/features/rehearsals/components/rehearsal-setlist";
import {
  buildRehearsalPayload,
  getDefaultRehearsalFormValues,
  toRehearsalFormValues,
  type RehearsalFormValues,
  type RehearsalSongOption,
} from "@/features/rehearsals/lib/rehearsal-ui";
import { useIsMobile } from "@/hooks/use-mobile";

export type RehearsalFormRehearsal = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  songs?: {
    songId: string;
    musicalKey?: string | null;
    notes?: string | null;
  }[];
};

type RehearsalFormDialogProps = {
  departmentId: string;
  songs: RehearsalSongOption[];
  rehearsal?: RehearsalFormRehearsal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  canEditSongs?: boolean;
};

export function RehearsalFormDialog({
  departmentId,
  songs,
  rehearsal = null,
  open,
  onOpenChange,
  onSaved,
  canEditSongs = true,
}: RehearsalFormDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [, startTransition] = useTransition();
  const isEditing = Boolean(rehearsal);

  const [values, setValues] = useState<RehearsalFormValues>(
    getDefaultRehearsalFormValues,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sincroniza os campos ao abrir ou trocar de ensaio (render-phase).
  const formSyncKey = open ? `open:${rehearsal?.id ?? "new"}` : "closed";
  const [prevFormSyncKey, setPrevFormSyncKey] = useState(formSyncKey);

  if (formSyncKey !== prevFormSyncKey) {
    setPrevFormSyncKey(formSyncKey);
    if (open) {
      setSubmitError(null);
      setValues(
        rehearsal
          ? toRehearsalFormValues(rehearsal)
          : getDefaultRehearsalFormValues(),
      );
    }
  }

  const update = <K extends keyof RehearsalFormValues>(
    key: K,
    value: RehearsalFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let payload: ReturnType<typeof buildRehearsalPayload>;
    try {
      payload = buildRehearsalPayload(values);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Confira os dados do ensaio antes de salvar.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = rehearsal
        ? await updateRehearsalAction(departmentId, rehearsal.id, payload)
        : await createRehearsalAction(departmentId, payload);

      if (!result.ok) {
        setSubmitError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(
        rehearsal
          ? "Ensaio atualizado."
          : payload.notifyImmediately
            ? "Ensaio criado e aviso enviado à equipe."
            : "Ensaio criado.",
      );
      startTransition(() => router.refresh());
      onOpenChange(false);
      onSaved?.();
    } catch {
      const message = "Não foi possível salvar o ensaio. Tente novamente.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formBody = (
    <form id="rehearsal-editor-form" onSubmit={handleSubmit} className="space-y-4">
      {submitError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {submitError}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="rehearsal-title">
          Título <span className="text-destructive">*</span>
        </Label>
        <Input
          id="rehearsal-title"
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder="Ensaio do louvor"
          className="h-11 sm:h-10"
          maxLength={160}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rehearsal-description">
          Descrição{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="rehearsal-description"
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Objetivo do ensaio, orientações para a equipe..."
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rehearsal-location">
          Local{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="rehearsal-location"
          value={values.location}
          onChange={(event) => update("location", event.target.value)}
          placeholder="Templo principal"
          className="h-11 sm:h-10"
          maxLength={200}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rehearsal-date">
            Data <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rehearsal-date"
            type="date"
            value={values.date}
            onChange={(event) => update("date", event.target.value)}
            className="h-11 sm:h-10"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rehearsal-start">Início</Label>
          <Input
            id="rehearsal-start"
            type="time"
            value={values.startTime}
            onChange={(event) => update("startTime", event.target.value)}
            className="h-11 sm:h-10"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rehearsal-end">Término</Label>
          <Input
            id="rehearsal-end"
            type="time"
            value={values.endTime}
            onChange={(event) => update("endTime", event.target.value)}
            className="h-11 sm:h-10"
            required
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="rehearsal-notify"
            checked={values.notifyImmediately}
            onCheckedChange={(checked) =>
              update("notifyImmediately", checked === true)
            }
            className="mt-0.5"
          />
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="rehearsal-notify" className="text-sm font-medium">
              Avisar a equipe agora
            </Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Envia uma notificação imediata no app e push. Os lembretes
              automáticos do departamento continuam valendo.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BellRingIcon className="size-3.5" aria-hidden />
          Lembretes automáticos seguem as regras configuradas no departamento.
        </div>
        <RehearsalSetlist
          songs={songs}
          entries={values.songs}
          onChange={(entries) => update("songs", entries)}
          disabled={submitting || !canEditSongs}
          idPrefix="rehearsal"
        />
      </div>
    </form>
  );

  const title = isEditing ? "Editar ensaio" : "Novo ensaio";
  const description = isEditing
    ? "Atualize a data, o local e o repertório do ensaio."
    : "Agende o ensaio, defina o repertório e avise a equipe.";
  const submitLabel = isEditing ? "Salvar alterações" : "Criar ensaio";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-auto max-h-[90dvh] flex-col gap-0 rounded-t-[24px] p-0 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
          <DrawerHeader className="shrink-0 border-b px-4 pt-3 pb-3 !text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="font-heading text-xl">{title}</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              {description}
            </DrawerDescription>
          </DrawerHeader>

          <div
            data-vaul-no-drag=""
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-3.5 [-webkit-overflow-scrolling:touch]"
          >
            {formBody}
          </div>

          <DrawerFooter className="shrink-0 flex-row items-center gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="min-h-11 shrink-0 px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="rehearsal-editor-form"
              disabled={submitting}
              className="min-h-11 flex-1"
            >
              {submitting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <CalendarClockIcon className="size-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {formBody}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="rehearsal-editor-form" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

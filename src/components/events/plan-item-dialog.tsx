"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { ClockIcon, FolderPlusIcon, PlusIcon, UserIcon } from "lucide-react";

import {
  createPlanItemAction,
  updatePlanItemAction,
  type PlanItemFormState,
} from "@/app/actions/events";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDurationSeconds, parseDurationToSeconds } from "@/lib/plan-utils";
import { getInitials } from "@/lib/format";

type PersonOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

type PlanItemDialogProps = {
  eventId: string;
  people: PersonOption[];
  mode: "create-item" | "create-header" | "edit";
  initialItem?: {
    id: string;
    type: "header" | "item";
    title: string;
    description: string | null;
    durationSeconds: number;
    personId: string | null;
    customResponsible: string | null;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PlanItemDialog({
  eventId,
  people,
  mode,
  initialItem,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: PlanItemDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const isHeader =
    mode === "create-header" || (mode === "edit" && initialItem?.type === "header");

  const [responsibleType, setResponsibleType] = useState<"person" | "custom">(
    initialItem?.personId ? "person" : "custom",
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    initialItem?.personId ?? "",
  );
  const [durationInput, setDurationInput] = useState<string>(
    initialItem?.durationSeconds
      ? formatDurationSeconds(initialItem.durationSeconds)
      : "5:00",
  );

  const actionFn = mode === "edit" ? updatePlanItemAction : createPlanItemAction;

  const [state, formAction, isPending] = useActionState<
    PlanItemFormState,
    FormData
  >(async (prevState, formData) => {
    // Inject calculated duration seconds
    if (!isHeader) {
      const seconds = parseDurationToSeconds(durationInput);
      formData.set("durationSeconds", seconds.toString());
    } else {
      formData.set("durationSeconds", "0");
    }

    if (responsibleType === "person") {
      formData.set("personId", selectedPersonId);
      formData.set("customResponsible", "");
    } else {
      formData.set("personId", "");
    }

    const res = await actionFn(prevState, formData);
    if (res?.success) {
      toast.success(
        mode === "edit"
          ? "Item atualizado com sucesso."
          : isHeader
            ? "Seção criada no cronograma."
            : "Item adicionado ao cronograma.",
      );
      setOpen(false);
    } else if (res?.error) {
      toast.error(res.error);
    }
    return res;
  }, undefined);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === "create-header" ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FolderPlusIcon className="size-3.5" />
            Adicionar Seção
          </Button>
        </DialogTrigger>
      ) : mode === "create-item" ? (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="size-3.5" />
            Adicionar Item
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? isHeader
                ? "Editar Seção"
                : "Editar Item do Cronograma"
              : isHeader
                ? "Nova Seção no Cronograma"
                : "Novo Item no Cronograma"}
          </DialogTitle>
          <DialogDescription>
            {isHeader
              ? "Defina um cabeçalho para agrupar momentos do culto (ex: LOUVOR, MENSAGEM, INTRODUÇÃO)."
              : "Cadastre momentos do culto com tempo estimado, descrição e quem conduzirá."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4 py-2">
          <input type="hidden" name="eventId" value={eventId} />
          {initialItem?.id ? (
            <input type="hidden" name="id" value={initialItem.id} />
          ) : null}
          <input
            type="hidden"
            name="type"
            value={isHeader ? "header" : "item"}
          />

          <FieldGroup>
            <Field data-invalid={Boolean(state?.fieldErrors?.title)}>
              <FieldLabel htmlFor="plan-title">
                {isHeader ? "Nome da seção" : "Título do momento"}
              </FieldLabel>
              <Input
                id="plan-title"
                name="title"
                defaultValue={initialItem?.title ?? ""}
                placeholder={
                  isHeader
                    ? "ex: INTRODUÇÃO, LOUVOR & ADORAÇÃO, MENSAGEM"
                    : "ex: Oração Inicial, Saudação aos Visitantes, Louvor: Hosana"
                }
                required
                className="h-10"
                aria-invalid={Boolean(state?.fieldErrors?.title)}
              />
              <FieldError
                errors={state?.fieldErrors?.title?.map((m) => ({ message: m }))}
              />
            </Field>

            {!isHeader ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(state?.fieldErrors?.durationSeconds)}>
                    <FieldLabel htmlFor="duration">Duração (MM:SS ou min)</FieldLabel>
                    <div className="relative">
                      <ClockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="duration"
                        value={durationInput}
                        onChange={(e) => setDurationInput(e.target.value)}
                        placeholder="ex: 5:00 ou 10"
                        className="h-10 pl-9"
                      />
                    </div>
                    <FieldDescription>
                      Ex: 5:00 para 5 min, 12:30 para 12m 30s.
                    </FieldDescription>
                    <FieldError
                      errors={state?.fieldErrors?.durationSeconds?.map((m) => ({
                        message: m,
                      }))}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Tipo de responsável</FieldLabel>
                    <div className="flex h-10 items-center rounded-lg border bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => setResponsibleType("person")}
                        className={`flex-1 rounded-md text-xs font-medium py-1.5 transition-colors ${
                          responsibleType === "person"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Pessoa da Igreja
                      </button>
                      <button
                        type="button"
                        onClick={() => setResponsibleType("custom")}
                        className={`flex-1 rounded-md text-xs font-medium py-1.5 transition-colors ${
                          responsibleType === "custom"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Nome Manual
                      </button>
                    </div>
                  </Field>
                </div>

                {responsibleType === "person" ? (
                  <Field>
                    <FieldLabel htmlFor="person-select">Responsável</FieldLabel>
                    <Select
                      value={selectedPersonId}
                      onValueChange={setSelectedPersonId}
                    >
                      <SelectTrigger id="person-select" className="h-10">
                        <SelectValue placeholder="Selecione uma pessoa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-5">
                                <AvatarImage src={p.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{p.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="custom-responsible">
                      Responsável (nome ou ministério)
                    </FieldLabel>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="custom-responsible"
                        name="customResponsible"
                        defaultValue={initialItem?.customResponsible ?? ""}
                        placeholder="ex: Ir. Kely, Pr. Leandro | Priscila, Ministério de Louvor"
                        className="h-10 pl-9"
                      />
                    </div>
                  </Field>
                )}

                <Field data-invalid={Boolean(state?.fieldErrors?.description)}>
                  <FieldLabel htmlFor="plan-desc">
                    Detalhes / Músicas / Passagens bíblicas
                  </FieldLabel>
                  <Textarea
                    id="plan-desc"
                    name="description"
                    defaultValue={initialItem?.description ?? ""}
                    placeholder="ex: Louvor: Jesus em tua presença; Leitura bíblica: Salmo 23; Notas da equipe..."
                    rows={3}
                  />
                  <FieldError
                    errors={state?.fieldErrors?.description?.map((m) => ({
                      message: m,
                    }))}
                  />
                </Field>
              </>
            ) : null}
          </FieldGroup>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvando..."
                : mode === "edit"
                  ? "Salvar alterações"
                  : isHeader
                    ? "Criar Seção"
                    : "Adicionar Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

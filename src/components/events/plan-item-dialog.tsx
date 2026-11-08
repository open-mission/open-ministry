"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClockIcon, FolderPlusIcon, Music2Icon, PlusIcon, UserIcon } from "lucide-react";

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
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDurationSeconds, parseDurationToSeconds } from "@/lib/plan-utils";
import { getInitials } from "@/lib/format";

export type PersonOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type SongOption = {
  id: string;
  title: string;
  artist?: string | null;
  tone?: string | null;
};

type PlanItemDialogProps = {
  eventId: string;
  people: PersonOption[];
  songs?: SongOption[];
  mode: "create-item" | "create-header" | "edit";
  initialItem?: {
    id: string;
    type: "header" | "item";
    title: string;
    description: string | null;
    durationSeconds: number;
    personId: string | null;
    customResponsible: string | null;
    songId?: string | null;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onItemSaved?: (savedItem: {
    id?: string;
    type: "header" | "item";
    title: string;
    description: string | null;
    durationSeconds: number;
    personId: string | null;
    customResponsible: string | null;
    songId?: string | null;
  }) => void;
};

export function PlanItemDialog({
  eventId,
  people,
  songs = [],
  mode,
  initialItem,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onItemSaved,
}: PlanItemDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
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
  const [selectedSongId, setSelectedSongId] = useState<string>(
    initialItem?.songId ?? "none",
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

    if (selectedSongId && selectedSongId !== "none") {
      formData.set("songId", selectedSongId);
    } else {
      formData.set("songId", "");
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
      if (onItemSaved) {
        onItemSaved({
          id: initialItem?.id,
          type: isHeader ? "header" : "item",
          title: String(formData.get("title") ?? ""),
          description: formData.get("description")
            ? String(formData.get("description"))
            : null,
          durationSeconds: Number(formData.get("durationSeconds") ?? 0),
          personId: formData.get("personId")
            ? String(formData.get("personId"))
            : null,
          customResponsible: formData.get("customResponsible")
            ? String(formData.get("customResponsible"))
            : null,
          songId: formData.get("songId")
            ? String(formData.get("songId"))
            : null,
        });
      }
      setOpen(false);
      router.refresh();
    } else if (res?.error) {
      toast.error(res.error);
    }
    return res;
  }, undefined);

  const titleText =
    mode === "edit"
      ? isHeader
        ? "Editar Seção"
        : "Editar Item do Cronograma"
      : isHeader
        ? "Nova Seção no Cronograma"
        : "Novo Item no Cronograma";

  const descriptionText = isHeader
    ? "Defina um cabeçalho para agrupar momentos do culto (ex: LOUVOR, MENSAGEM, INTRODUÇÃO)."
    : "Cadastre momentos do culto com tempo estimado, descrição e quem conduzirá.";

  const submitButtonText = isPending
    ? "Salvando..."
    : mode === "edit"
      ? "Salvar alterações"
      : isHeader
        ? "Criar Seção"
        : "Adicionar Item";

  const triggerButton =
    mode === "create-header" ? (
      <Button variant="outline" size="sm" className="gap-1.5">
        <FolderPlusIcon className="size-3.5" />
        Adicionar Seção
      </Button>
    ) : mode === "create-item" ? (
      <Button size="sm" className="gap-1.5">
        <PlusIcon className="size-3.5" />
        Adicionar Item
      </Button>
    ) : null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setOpen}>
        {trigger ? (
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        ) : triggerButton ? (
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        ) : null}

        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[94vh] h-[94vh] flex flex-col">
          <DrawerHeader className="text-left px-4 pt-3 pb-2 shrink-0">
            <DrawerTitle>{titleText}</DrawerTitle>
            <DrawerDescription>{descriptionText}</DrawerDescription>
          </DrawerHeader>

          <form action={formAction} className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
              <PlanItemFields
                eventId={eventId}
                initialItem={initialItem}
                isHeader={isHeader}
                durationInput={durationInput}
                setDurationInput={setDurationInput}
                responsibleType={responsibleType}
                setResponsibleType={setResponsibleType}
                selectedPersonId={selectedPersonId}
                setSelectedPersonId={setSelectedPersonId}
                people={people}
                songs={songs}
                selectedSongId={selectedSongId}
                setSelectedSongId={setSelectedSongId}
                state={state}
              />
            </div>

            <DrawerFooter className="px-4 py-3 shrink-0 border-t bg-background">
              <Button type="submit" disabled={isPending} className="w-full">
                {submitButtonText}
              </Button>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : triggerButton ? (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4 py-2">
          <PlanItemFields
            eventId={eventId}
            initialItem={initialItem}
            isHeader={isHeader}
            durationInput={durationInput}
            setDurationInput={setDurationInput}
            responsibleType={responsibleType}
            setResponsibleType={setResponsibleType}
            selectedPersonId={selectedPersonId}
            setSelectedPersonId={setSelectedPersonId}
            people={people}
            songs={songs}
            selectedSongId={selectedSongId}
            setSelectedSongId={setSelectedSongId}
            state={state}
          />

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
              {submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanItemFields({
  eventId,
  initialItem,
  isHeader,
  durationInput,
  setDurationInput,
  responsibleType,
  setResponsibleType,
  selectedPersonId,
  setSelectedPersonId,
  people,
  songs,
  selectedSongId,
  setSelectedSongId,
  state,
}: {
  eventId: string;
  initialItem?: PlanItemDialogProps["initialItem"];
  isHeader: boolean;
  durationInput: string;
  setDurationInput: (val: string) => void;
  responsibleType: "person" | "custom";
  setResponsibleType: (val: "person" | "custom") => void;
  selectedPersonId: string;
  setSelectedPersonId: (val: string) => void;
  people: PersonOption[];
  songs: SongOption[];
  selectedSongId: string;
  setSelectedSongId: (val: string) => void;
  state: PlanItemFormState;
}) {
  return (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      {initialItem?.id ? (
        <input type="hidden" name="id" value={initialItem.id} />
      ) : null}
      <input type="hidden" name="type" value={isHeader ? "header" : "item"} />

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

        {!isHeader && songs.length > 0 ? (
          <Field>
            <FieldLabel htmlFor="plan-song-select" className="flex items-center gap-1.5">
              <Music2Icon className="size-3.5 text-primary" />
              Música do Repertório (opcional)
            </FieldLabel>
            <Select
              value={selectedSongId}
              onValueChange={setSelectedSongId}
            >
              <SelectTrigger id="plan-song-select" className="h-10">
                <SelectValue placeholder="Vincular música do repertório..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma música vinculada</SelectItem>
                {songs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-medium">{s.title}</span>
                      {s.artist ? (
                        <span className="text-muted-foreground text-xs">
                          · {s.artist}
                        </span>
                      ) : null}
                      {s.tone ? (
                        <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
                          {s.tone}
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Vincula cifras e links diretamente ao momento do culto.
            </FieldDescription>
          </Field>
        ) : null}

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
    </>
  );
}

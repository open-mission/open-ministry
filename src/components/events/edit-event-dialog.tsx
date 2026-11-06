"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import {
  updateEventAction,
  type EventFormState,
} from "@/app/actions/events";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { DepartmentCheckboxRow } from "@/components/events/department-checkbox-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type DepartmentOption = {
  id: string;
  name: string;
};

export function EditEventDialog({
  event,
  departments,
  selectedDepartmentIds,
  defaultDate,
  defaultTime,
  defaultDuration,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    kind: string;
    location: string | null;
    seriesId: string | null;
  };
  departments: DepartmentOption[];
  selectedDepartmentIds: string[];
  defaultDate: string;
  defaultTime: string;
  defaultDuration: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon data-icon="inline-start" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Editar culto ou evento
          </DialogTitle>
          <DialogDescription>
            {event.seriesId
              ? "Este evento faz parte de uma série recorrente. Escolha se a alteração vale só para esta ocorrência ou para todas."
              : "Ajuste os dados e os departamentos que atuam neste evento."}
          </DialogDescription>
        </DialogHeader>
        <EditEventForm
          event={event}
          departments={departments}
          selectedDepartmentIds={selectedDepartmentIds}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          defaultDuration={defaultDuration}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditEventForm({
  event,
  departments,
  selectedDepartmentIds,
  defaultDate,
  defaultTime,
  defaultDuration,
  onDone,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    kind: string;
    location: string | null;
    seriesId: string | null;
  };
  departments: DepartmentOption[];
  selectedDepartmentIds: string[];
  defaultDate: string;
  defaultTime: string;
  defaultDuration: number;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<EventFormState, FormData>(
    updateEventAction,
    undefined,
  );
  const [scope, setScope] = useState("single");
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Evento atualizado.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventId" value={event.id} />

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.title)}>
          <FieldLabel htmlFor="edit-event-title">Nome</FieldLabel>
          <Input
            id="edit-event-title"
            name="title"
            defaultValue={event.title}
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.title)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.title?.map((message) => ({ message }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state?.fieldErrors?.kind)}>
            <FieldLabel htmlFor="edit-event-kind">Tipo</FieldLabel>
            <NativeSelect
              id="edit-event-kind"
              name="kind"
              defaultValue={event.kind}
              className="w-full [&_select]:h-10"
              aria-invalid={Boolean(state?.fieldErrors?.kind)}
            >
              <NativeSelectOption value="service">Culto</NativeSelectOption>
              <NativeSelectOption value="event">Evento</NativeSelectOption>
            </NativeSelect>
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.location)}>
            <FieldLabel htmlFor="edit-event-location">
              Local{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              id="edit-event-location"
              name="location"
              defaultValue={event.location ?? ""}
              className="h-10"
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.date)}>
            <FieldLabel htmlFor="edit-event-date">Data</FieldLabel>
            <Input
              id="edit-event-date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.date)}
              required
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.startTime)}>
            <FieldLabel htmlFor="edit-event-time">
              Horário de início
            </FieldLabel>
            <Input
              id="edit-event-time"
              name="startTime"
              type="time"
              defaultValue={defaultTime}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.startTime)}
              required
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.durationMinutes)}>
            <FieldLabel htmlFor="edit-event-duration">
              Duração em minutos
            </FieldLabel>
            <Input
              id="edit-event-duration"
              name="durationMinutes"
              type="number"
              min={15}
              max={1440}
              step={15}
              defaultValue={defaultDuration}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.durationMinutes)}
              required
            />
          </Field>

          {event.seriesId ? (
            <Field>
              <FieldLabel htmlFor="edit-event-scope">Aplicar em</FieldLabel>
              <NativeSelect
                id="edit-event-scope"
                name="scope"
                value={scope}
                onChange={(changeEvent) => setScope(changeEvent.target.value)}
                className="w-full [&_select]:h-10"
              >
                <NativeSelectOption value="single">
                  Só esta ocorrência
                </NativeSelectOption>
                <NativeSelectOption value="series">
                  Todas as ocorrências desta série
                </NativeSelectOption>
              </NativeSelect>
              <FieldDescription>
                {scope === "series"
                  ? "Nome, descrição, local e horário valem para a série. A data vale só para esta ocorrência."
                  : "As demais ocorrências continuam como estão."}
              </FieldDescription>
            </Field>
          ) : null}
        </div>

        <Field data-invalid={Boolean(state?.fieldErrors?.description)}>
          <FieldLabel htmlFor="edit-event-description">
            Descrição{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="edit-event-description"
            name="description"
            defaultValue={event.description ?? ""}
            rows={3}
            aria-invalid={Boolean(state?.fieldErrors?.description)}
          />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Departamentos atuando</FieldLegend>
          {departments.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nenhum departamento cadastrado ainda.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {departments.map((department) => (
                <DepartmentCheckboxRow
                  key={department.id}
                  value={department.id}
                  label={department.name}
                  defaultChecked={selectedDepartmentIds.includes(
                    department.id,
                  )}
                />
              ))}
            </div>
          )}
        </FieldSet>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Salvando..."
        size="lg"
      >
        Salvar alterações
      </SubmitButton>
    </form>
  );
}

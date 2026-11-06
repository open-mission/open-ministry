"use client";

import { useActionState, useState } from "react";
import { CalendarPlusIcon } from "lucide-react";

import {
  createEventAction,
  type EventFormState,
} from "@/app/actions/events";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  RECURRENCE_OPTIONS,
  recurrenceLabels,
} from "@/lib/event-options";

type DepartmentOption = {
  id: string;
  name: string;
};

export function CreateEventDialog({
  departments,
  defaultDate,
}: {
  departments: DepartmentOption[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-9">
          <CalendarPlusIcon data-icon="inline-start" />
          Novo culto ou evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Novo culto ou evento
          </DialogTitle>
          <DialogDescription>
            Defina a data, os departamentos que atuam e, depois, monte a escala
            com calma.
          </DialogDescription>
        </DialogHeader>
        <CreateEventForm
          departments={departments}
          defaultDate={defaultDate}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateEventForm({
  departments,
  defaultDate,
}: {
  departments: DepartmentOption[];
  defaultDate: string;
}) {
  const [state, formAction] = useActionState<EventFormState, FormData>(
    createEventAction,
    undefined,
  );
  const [recurrence, setRecurrence] = useState("none");

  return (
    <form action={formAction} className="space-y-5">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.title)}>
          <FieldLabel htmlFor="event-title">Nome</FieldLabel>
          <Input
            id="event-title"
            name="title"
            placeholder="Culto de domingo, Ensaio do louvor..."
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
            <FieldLabel htmlFor="event-kind">Tipo</FieldLabel>
            <NativeSelect
              id="event-kind"
              name="kind"
              defaultValue="service"
              className="w-full [&_select]:h-10"
              aria-invalid={Boolean(state?.fieldErrors?.kind)}
            >
              <NativeSelectOption value="service">Culto</NativeSelectOption>
              <NativeSelectOption value="event">Evento</NativeSelectOption>
            </NativeSelect>
            <FieldError
              errors={state?.fieldErrors?.kind?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.location)}>
            <FieldLabel htmlFor="event-location">
              Local{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              id="event-location"
              name="location"
              placeholder="Templo principal"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.location)}
            />
            <FieldError
              errors={state?.fieldErrors?.location?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.date)}>
            <FieldLabel htmlFor="event-date">Data</FieldLabel>
            <Input
              id="event-date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.date)}
              required
            />
            <FieldError
              errors={state?.fieldErrors?.date?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.startTime)}>
            <FieldLabel htmlFor="event-time">Horário de início</FieldLabel>
            <Input
              id="event-time"
              name="startTime"
              type="time"
              defaultValue="19:00"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.startTime)}
              required
            />
            <FieldError
              errors={state?.fieldErrors?.startTime?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.durationMinutes)}>
            <FieldLabel htmlFor="event-duration">
              Duração em minutos
            </FieldLabel>
            <Input
              id="event-duration"
              name="durationMinutes"
              type="number"
              min={15}
              max={1440}
              step={15}
              defaultValue={90}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.durationMinutes)}
              required
            />
            <FieldError
              errors={state?.fieldErrors?.durationMinutes?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.recurrence)}>
            <FieldLabel htmlFor="event-recurrence">Recorrência</FieldLabel>
            <NativeSelect
              id="event-recurrence"
              name="recurrence"
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value)}
              className="w-full [&_select]:h-10"
              aria-invalid={Boolean(state?.fieldErrors?.recurrence)}
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {recurrenceLabels[option]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError
              errors={state?.fieldErrors?.recurrence?.map((message) => ({
                message,
              }))}
            />
          </Field>
        </div>

        {recurrence !== "none" ? (
          <div className="grid gap-4 rounded-lg bg-muted/50 p-3 sm:grid-cols-2">
            <Field data-invalid={Boolean(state?.fieldErrors?.recurrenceEndsAt)}>
              <FieldLabel htmlFor="event-recurrence-end">
                Repetir até
              </FieldLabel>
              <Input
                id="event-recurrence-end"
                name="recurrenceEndsAt"
                type="date"
                defaultValue={defaultDate}
                className="h-10"
                aria-invalid={Boolean(state?.fieldErrors?.recurrenceEndsAt)}
                required
              />
              <FieldDescription>
                Cada data gera uma ocorrência com escala própria.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.recurrenceEndsAt?.map(
                  (message) => ({ message }),
                )}
              />
            </Field>

            {recurrence === "custom" ? (
              <Field
                data-invalid={Boolean(state?.fieldErrors?.recurrenceInterval)}
              >
                <FieldLabel htmlFor="event-recurrence-interval">
                  A cada quantas semanas?
                </FieldLabel>
                <Input
                  id="event-recurrence-interval"
                  name="recurrenceInterval"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={2}
                  className="h-10"
                  aria-invalid={Boolean(
                    state?.fieldErrors?.recurrenceInterval,
                  )}
                  required
                />
                <FieldError
                  errors={state?.fieldErrors?.recurrenceInterval?.map(
                    (message) => ({ message }),
                  )}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        <Field data-invalid={Boolean(state?.fieldErrors?.description)}>
          <FieldLabel htmlFor="event-description">
            Descrição{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="event-description"
            name="description"
            placeholder="Tema, observações e o que a equipe precisa saber."
            rows={3}
            aria-invalid={Boolean(state?.fieldErrors?.description)}
          />
          <FieldError
            errors={state?.fieldErrors?.description?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Departamentos atuando</FieldLegend>
          {departments.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nenhum departamento cadastrado ainda. Você pode criar o evento e
              adicionar os departamentos depois.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {departments.map((department) => (
                <label
                  key={department.id}
                  htmlFor={`event-department-${department.id}`}
                  className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    id={`event-department-${department.id}`}
                    name="departments"
                    value={department.id}
                  />
                  {department.name}
                </label>
              ))}
            </div>
          )}
          <FieldError
            errors={state?.fieldErrors?.departments?.map((message) => ({
              message,
            }))}
          />
        </FieldSet>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Criando..."
        size="lg"
      >
        <CalendarPlusIcon data-icon="inline-start" />
        Criar culto ou evento
      </SubmitButton>
    </form>
  );
}

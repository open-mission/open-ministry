"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarPlusIcon, RepeatIcon } from "lucide-react";

import {
  createEventAction,
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
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import {
  findNthWeekdayOfMonth,
  formatNthWeekdayLabel,
  getNthWeekdayInfo,
} from "@/lib/recurrence-utils";
import { computeDurationMinutes, computeEndTime } from "@/lib/plan-utils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type DepartmentOption = {
  id: string;
  name: string;
};

export function CreateEventDialog({
  departments,
  defaultDate,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  departments: DepartmentOption[];
  defaultDate: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (setControlledOpen ?? (() => {})) : setUncontrolledOpen;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {trigger !== undefined ? (
          trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null
        ) : (
          <DrawerTrigger asChild>
            <Button size="lg" className="h-9">
              <CalendarPlusIcon data-icon="inline-start" />
              Novo culto ou evento
            </Button>
          </DrawerTrigger>
        )}
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="font-heading text-xl tracking-tight">
              Novo culto ou evento
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground text-left">
              Defina a data, os departamentos que atuam e, depois, monte a escala
              com calma.
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[80vh] overflow-y-auto px-5 py-4 pb-8 [-webkit-overflow-scrolling:touch]">
            <CreateEventForm
              departments={departments}
              defaultDate={defaultDate}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null
      ) : (
        <DialogTrigger asChild>
          <Button size="lg" className="h-9">
            <CalendarPlusIcon data-icon="inline-start" />
            Novo culto ou evento
          </Button>
        </DialogTrigger>
      )}
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
  const isMobile = useIsMobile();
  const [state, formAction] = useActionState<EventFormState, FormData>(
    createEventAction,
    undefined,
  );
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [recurrence, setRecurrence] = useState("none");
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const durationMinutes = computeDurationMinutes(startTime, endTime);

  const weekdayInfo = useMemo(
    () => getNthWeekdayInfo(selectedDate || defaultDate),
    [selectedDate, defaultDate],
  );

  const [customNthPosition, setCustomNthPosition] = useState<number | null>(
    null,
  );
  const nthPosition = customNthPosition ?? weekdayInfo.nth;

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setCustomNthPosition(null);
  };

  const defaultEndDate = useMemo(() => {
    try {
      const [y, m, d] = (selectedDate || defaultDate).split("-").map(Number);
      const future = new Date(y, m - 1 + 6, d);
      const fy = future.getFullYear();
      const fm = String(future.getMonth() + 1).padStart(2, "0");
      const fd = String(future.getDate()).padStart(2, "0");
      return `${fy}-${fm}-${fd}`;
    } catch {
      return defaultDate;
    }
  }, [selectedDate, defaultDate]);

  const previewDates = useMemo(() => {
    if (recurrence !== "monthly_nth_weekday" || !selectedDate) return [];
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const targetWeekday = weekdayInfo.weekday;
      const nth = nthPosition;
      const results: string[] = [];

      for (let offset = 0; offset < 12; offset++) {
        const dObj = new Date(y, m - 1 + offset, 1);
        const year = dObj.getFullYear();
        const month = dObj.getMonth();
        const day = findNthWeekdayOfMonth(year, month, targetWeekday, nth);
        if (!day) continue;

        const dateObj = new Date(year, month, day);
        const selObj = new Date(y, m - 1, d);
        if (dateObj.getTime() < selObj.getTime()) continue;

        const formatted = `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
        results.push(formatted);
        if (results.length >= 4) break;
      }

      return results;
    } catch {
      return [];
    }
  }, [recurrence, selectedDate, weekdayInfo.weekday, nthPosition]);

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    setEndTime(computeEndTime(newStartTime, durationMinutes || 90));
  };

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
            autoFocus={!isMobile}
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
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
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
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
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
            <FieldLabel htmlFor="event-end-time">
              Horário de término aproximado
            </FieldLabel>
            <Input
              id="event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-10"
              required
            />
            <input
              type="hidden"
              name="durationMinutes"
              value={durationMinutes}
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
                  {option === "monthly_nth_weekday"
                    ? (weekdayInfo?.label ?? recurrenceLabels[option])
                    : recurrenceLabels[option]}
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
          <div className="grid gap-4 rounded-lg bg-muted/50 p-3.5 sm:grid-cols-2">
            <Field data-invalid={Boolean(state?.fieldErrors?.recurrenceEndsAt)}>
              <FieldLabel htmlFor="event-recurrence-end">
                Repetir até
              </FieldLabel>
              <Input
                id="event-recurrence-end"
                name="recurrenceEndsAt"
                type="date"
                defaultValue={defaultEndDate}
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

            {recurrence === "monthly_nth_weekday" ? (
              <Field
                data-invalid={Boolean(state?.fieldErrors?.recurrenceInterval)}
              >
                <FieldLabel htmlFor="event-recurrence-nth">
                  Qual semana do mês?
                </FieldLabel>
                <NativeSelect
                  id="event-recurrence-nth"
                  name="recurrenceInterval"
                  value={String(nthPosition)}
                  onChange={(e) => setCustomNthPosition(Number(e.target.value))}
                  className="w-full [&_select]:h-10"
                  aria-invalid={Boolean(
                    state?.fieldErrors?.recurrenceInterval,
                  )}
                >
                  <NativeSelectOption value="1">
                    1ª semana (1º {weekdayInfo.shortName})
                  </NativeSelectOption>
                  <NativeSelectOption value="2">
                    2ª semana (2º {weekdayInfo.shortName})
                  </NativeSelectOption>
                  <NativeSelectOption value="3">
                    3ª semana (3º {weekdayInfo.shortName})
                  </NativeSelectOption>
                  <NativeSelectOption value="4">
                    4ª semana (4º {weekdayInfo.shortName})
                  </NativeSelectOption>
                  {weekdayInfo.nth === 5 ? (
                    <NativeSelectOption value="5">
                      5ª semana (5º {weekdayInfo.shortName})
                    </NativeSelectOption>
                  ) : null}
                  <NativeSelectOption value="-1">
                    Última semana (último(a) {weekdayInfo.shortName})
                  </NativeSelectOption>
                </NativeSelect>
                <FieldError
                  errors={state?.fieldErrors?.recurrenceInterval?.map(
                    (message) => ({ message }),
                  )}
                />
              </Field>
            ) : null}

            {recurrence === "monthly_nth_weekday" ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2 sm:col-span-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <RepeatIcon className="size-3.5 text-primary" />
                  <span>
                    {formatNthWeekdayLabel(nthPosition, weekdayInfo.weekday)}
                  </span>
                </div>
                {previewDates.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[0.72rem] text-muted-foreground">
                      Próximas ocorrências estimadas:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDates.map((pDate, idx) => (
                        <span
                          key={pDate}
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[0.7rem] font-medium border shadow-2xs",
                            idx === 0
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-background text-foreground border-border",
                          )}
                        >
                          {pDate}
                          {idx === 0 ? " (primeiro)" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
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
                <DepartmentCheckboxRow
                  key={department.id}
                  value={department.id}
                  label={department.name}
                />
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

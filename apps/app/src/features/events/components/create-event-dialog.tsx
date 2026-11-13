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
  type RecurrenceOption,
} from "@/lib/event-options";
import {
  endOfDayInZone,
  formatNthWeekdayLabel,
  generateOccurrences,
  getNthWeekdayInfo,
  zonedDateTimeToUtc,
} from "@/lib/recurrence-utils";
import {
  computeDurationMinutes,
  computeEndTime,
  EVENT_TIME_ZONE,
} from "@/lib/plan-utils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import type { DepartmentOption } from "@/lib/departments";

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
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<
    Record<string, string[]>
  >({});
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [recurrence, setRecurrence] = useState<RecurrenceOption>("none");
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

  const handleDepartmentToggle = (departmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDepartments((prev) => [...prev, departmentId]);
      const dept = departments.find((d) => d.id === departmentId);
      setSelectedFunctions((prev) => ({
        ...prev,
        [departmentId]: dept?.functions?.map((f) => f.id) ?? [],
      }));
    } else {
      setSelectedDepartments((prev) => prev.filter((id) => id !== departmentId));
      setSelectedFunctions((prev) => {
        const next = { ...prev };
        delete next[departmentId];
        return next;
      });
    }
  };

  const handleFunctionToggle = (departmentId: string, functionId: string) => {
    setSelectedFunctions((prev) => {
      const current = prev[departmentId] ?? [];
      const next = current.includes(functionId)
        ? current.filter((id) => id !== functionId)
        : [...current, functionId];
      return { ...prev, [departmentId]: next };
    });
  };

  const handleSelectAllFunctions = (departmentId: string) => {
    const dept = departments.find((d) => d.id === departmentId);
    setSelectedFunctions((prev) => ({
      ...prev,
      [departmentId]: dept?.functions?.map((f) => f.id) ?? [],
    }));
  };

  const handleDeselectAllFunctions = (departmentId: string) => {
    setSelectedFunctions((prev) => ({
      ...prev,
      [departmentId]: [],
    }));
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

  const [recurrenceEndsAt, setRecurrenceEndsAt] = useState(defaultEndDate);
  const [customInterval, setCustomInterval] = useState(2);

  const occurrencePreview = useMemo(() => {
    if (recurrence === "none" || !selectedDate || !recurrenceEndsAt) {
      return null;
    }

    try {
      const startsAt = zonedDateTimeToUtc(selectedDate, startTime);
      const endsAt = new Date(
        startsAt.getTime() + (durationMinutes || 90) * 60_000,
      );
      const occurrences = generateOccurrences({
        startsAt,
        endsAt,
        recurrence: recurrence as RecurrenceOption,
        recurrenceInterval:
          recurrence === "custom"
            ? customInterval
            : recurrence === "monthly_nth_weekday"
              ? nthPosition
              : null,
        recurrenceEndsAt: endOfDayInZone(recurrenceEndsAt),
      });

      return {
        count: occurrences.length,
        dates: occurrences.slice(0, 4).map((occurrence) =>
          new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            timeZone: EVENT_TIME_ZONE,
          }).format(occurrence.startsAt),
        ),
      };
    } catch {
      return null;
    }
  }, [
    recurrence,
    selectedDate,
    recurrenceEndsAt,
    startTime,
    durationMinutes,
    customInterval,
    nthPosition,
  ]);

  const formattedEndDate = (() => {
    const [year, month, day] = recurrenceEndsAt.split("-");
    return year && month && day ? `${day}/${month}/${year}` : recurrenceEndsAt;
  })();

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
              onChange={(event) =>
                setRecurrence(event.target.value as RecurrenceOption)
              }
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
                value={recurrenceEndsAt}
                onChange={(event) => setRecurrenceEndsAt(event.target.value)}
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
                  value={customInterval}
                  onChange={(event) =>
                    setCustomInterval(Number(event.target.value) || 1)
                  }
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

            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs sm:col-span-2">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <RepeatIcon className="size-3.5 text-primary" />
                <span>
                  {recurrence === "monthly_nth_weekday"
                    ? formatNthWeekdayLabel(
                        nthPosition,
                        weekdayInfo.weekday,
                      )
                    : recurrenceLabels[recurrence]}
                </span>
              </div>
              {occurrencePreview ? (
                <div className="space-y-1">
                  <p className="text-[0.75rem] text-muted-foreground">
                    {occurrencePreview.count === 1
                      ? "1 encontro estimado"
                      : `${occurrencePreview.count} encontros estimados`}{" "}
                    até {formattedEndDate}. Cada data tem escala própria.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {occurrencePreview.dates.map((previewDate, index) => (
                      <span
                        key={previewDate}
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[0.75rem] font-medium shadow-2xs",
                          index === 0
                            ? "border-primary/30 bg-primary/15 text-primary"
                            : "border-border bg-background text-foreground",
                        )}
                      >
                        {previewDate}
                        {index === 0 ? " (primeiro)" : ""}
                      </span>
                    ))}
                    {occurrencePreview.count > occurrencePreview.dates.length ? (
                      <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[0.75rem] font-medium text-muted-foreground">
                        +{occurrencePreview.count - occurrencePreview.dates.length}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
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
          <FieldLegend variant="label">Departamentos e funções atuando</FieldLegend>
          {departments.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nenhum departamento cadastrado ainda. Você pode criar o evento e
              adicionar os departamentos depois.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {departments.map((department) => (
                <DepartmentCheckboxRow
                  key={department.id}
                  department={department}
                  checked={selectedDepartments.includes(department.id)}
                  onCheckedChange={(checked) =>
                    handleDepartmentToggle(department.id, checked)
                  }
                  selectedFunctionIds={selectedFunctions[department.id] ?? []}
                  onFunctionToggle={(fnId) =>
                    handleFunctionToggle(department.id, fnId)
                  }
                  onSelectAllFunctions={() =>
                    handleSelectAllFunctions(department.id)
                  }
                  onDeselectAllFunctions={() =>
                    handleDeselectAllFunctions(department.id)
                  }
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

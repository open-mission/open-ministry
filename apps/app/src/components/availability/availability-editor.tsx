"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarX2Icon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  ClockIcon,
  Loader2Icon,
  MoonIcon,
  RotateCcwIcon,
  SparklesIcon,
  SunIcon,
  SunriseIcon,
} from "lucide-react";
import { toast } from "sonner";

import { saveMyAvailabilityAction } from "@/app/actions/availability";
import {
  DAYS_OF_WEEK,
  type DayAvailability,
  type MyAvailabilityResult,
} from "@/lib/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AvailabilityPeriod } from "@/db/schema/people";
import { cn } from "@/lib/utils";

type AvailabilityEditorProps = {
  initialData: MyAvailabilityResult;
};

const ALL_PERIODS: AvailabilityPeriod[] = [
  "morning",
  "afternoon",
  "evening",
];

const PERIODS: {
  id: AvailabilityPeriod;
  label: string;
  icon: typeof SunIcon;
  hint: string;
}[] = [
  {
    id: "morning",
    label: "Manhã",
    icon: SunriseIcon,
    hint: "6h às 12h",
  },
  {
    id: "afternoon",
    label: "Tarde",
    icon: SunIcon,
    hint: "12h às 18h",
  },
  {
    id: "evening",
    label: "Noite",
    icon: MoonIcon,
    hint: "18h às 23h",
  },
];

type EditableDay = DayAvailability & { informed: boolean };

type Baseline = {
  days: EditableDay[];
  notes: string;
};

function buildEditableDays(days: DayAvailability[]): EditableDay[] {
  return days.map((day) => ({
    ...day,
    periods: [...day.periods],
    informed: day.informed,
  }));
}

function snapshot(days: EditableDay[], notes: string): string {
  return JSON.stringify({
    notes: notes.trim(),
    days: days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      informed: day.informed,
      periods: [...day.periods].sort(),
    })),
  });
}

function getDayStatus(day: EditableDay) {
  if (!day.informed) return "uninformed" as const;
  if (day.periods.length === 0) return "unavailable" as const;
  return "available" as const;
}

export function AvailabilityEditor({ initialData }: AvailabilityEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState<EditableDay[]>(() =>
    buildEditableDays(initialData.days),
  );
  const [generalNotes, setGeneralNotes] = useState(initialData.notes || "");
  const [baseline, setBaseline] = useState<Baseline>(() => ({
    days: buildEditableDays(initialData.days),
    notes: initialData.notes || "",
  }));
  const [hasSavedOnce, setHasSavedOnce] = useState(initialData.hasSaved);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialData.updatedAt,
  );
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const currentSnapshot = useMemo(
    () => snapshot(days, generalNotes),
    [days, generalNotes],
  );
  const baselineSnapshot = useMemo(
    () => snapshot(baseline.days, baseline.notes),
    [baseline],
  );
  const isDirty = currentSnapshot !== baselineSnapshot;

  // Guard against losing a half-finished answer when the tab is reloaded.
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function updateDay(
    dayIndex: number,
    updater: (day: EditableDay) => EditableDay,
  ) {
    setDays((prev) =>
      prev.map((day) => (day.dayOfWeek === dayIndex ? updater(day) : day)),
    );
  }

  function togglePeriod(dayIndex: number, period: AvailabilityPeriod) {
    updateDay(dayIndex, (day) => {
      const exists = day.periods.includes(period);
      return {
        ...day,
        informed: true,
        periods: exists
          ? day.periods.filter((value) => value !== period)
          : ALL_PERIODS.filter(
              (value) => value === period || day.periods.includes(value),
            ),
      };
    });
  }

  function toggleWholeDay(dayIndex: number) {
    updateDay(dayIndex, (day) => {
      if (day.periods.length === ALL_PERIODS.length) {
        return { ...day, informed: true, periods: [] };
      }
      return { ...day, informed: true, periods: [...ALL_PERIODS] };
    });
  }

  function applyWeekendPreset() {
    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === 0 || day.dayOfWeek === 6
          ? { ...day, informed: true, periods: [...ALL_PERIODS] }
          : day,
      ),
    );
  }

  function applyWeeknightsPreset() {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === 0 || day.dayOfWeek === 6) return day;
        const periods = day.periods.includes("evening")
          ? day.periods
          : ALL_PERIODS.filter(
              (period) => period === "evening" || day.periods.includes(period),
            );
        return { ...day, informed: true, periods };
      }),
    );
  }

  function applyWeekendsAndWeeknightsPreset() {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === 0 || day.dayOfWeek === 6) {
          return { ...day, informed: true, periods: [...ALL_PERIODS] };
        }
        const periods = day.periods.includes("evening")
          ? day.periods
          : ALL_PERIODS.filter(
              (period) => period === "evening" || day.periods.includes(period),
            );
        return { ...day, informed: true, periods };
      }),
    );
  }

  function applyAllDaysPreset() {
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        informed: true,
        periods: [...ALL_PERIODS],
      })),
    );
  }

  function clearAll() {
    setDays((prev) =>
      prev.map((day) => ({ ...day, informed: true, periods: [] })),
    );
  }

  const presets = useMemo(
    () => [
      {
        id: "weekends",
        label: "Fins de semana",
        description: "Sábado e domingo livres o dia todo (manhã, tarde e noite)",
        icon: CalendarCheckIcon,
        iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        action: () => {
          applyWeekendPreset();
          setIsPresetsOpen(false);
          toast.success("Pré-definição aplicada: Fins de semana.");
        },
      },
      {
        id: "weeknights",
        label: "Noites nos dias úteis",
        description: "Segunda a sexta-feira no período da noite (18h às 23h)",
        icon: MoonIcon,
        iconColor: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
        action: () => {
          applyWeeknightsPreset();
          setIsPresetsOpen(false);
          toast.success("Pré-definição aplicada: Noites nos dias úteis.");
        },
      },
      {
        id: "weekends-weeknights",
        label: "Fins de semana e noites úteis",
        description: "Fins de semana o dia todo + noites durante a semana",
        icon: SparklesIcon,
        iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
        action: () => {
          applyWeekendsAndWeeknightsPreset();
          setIsPresetsOpen(false);
          toast.success("Pré-definição aplicada: Fins de semana e noites úteis.");
        },
      },
      {
        id: "all-days",
        label: "Semana inteira (todos os horários)",
        description: "Disponível todos os dias em todos os períodos",
        icon: CalendarDaysIcon,
        iconColor: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
        action: () => {
          applyAllDaysPreset();
          setIsPresetsOpen(false);
          toast.success("Pré-definição aplicada: Semana inteira.");
        },
      },
      {
        id: "clear",
        label: "Limpar todos os dias",
        description: "Marcar toda a semana como indisponível",
        icon: RotateCcwIcon,
        iconColor: "text-muted-foreground bg-muted",
        action: () => {
          clearAll();
          setIsPresetsOpen(false);
          toast.info("Disponibilidade limpa.");
        },
      },
    ],
    [],
  );

  function handleReset() {
    setDays(buildEditableDays(baseline.days));
    setGeneralNotes(baseline.notes);
  }

  function handleSave() {
    if (!isDirty || isPending) return;

    startTransition(async () => {
      const res = await saveMyAvailabilityAction({
        days: days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          periods: day.periods,
        })),
        generalNotes,
      });

      if (res.ok) {
        const savedAt = new Date(res.updatedAt);
        const savedDays = days.map((day) => ({ ...day, informed: true }));
        const savedNotes = generalNotes;

        setDays(savedDays);
        setBaseline({ days: buildEditableDays(savedDays), notes: savedNotes });
        setHasSavedOnce(true);
        setLastSavedAt(savedAt);
        toast.success(
          `Disponibilidade atualizada às ${format(savedAt, "HH:mm")}.`,
        );
      } else {
        toast.error(res.error || "Erro ao salvar disponibilidade.");
      }
    });
  }

  const daysWithAnswer = days.filter((day) => day.informed).length;
  const totalSelectedPeriods = days.reduce(
    (total, day) => total + day.periods.length,
    0,
  );

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDaysIcon className="size-5" aria-hidden="true" />
                </div>
                <CardTitle className="font-heading text-xl tracking-tight">
                  Sua semana
                </CardTitle>
              </div>
              <CardDescription>
                Marque os períodos em que você costuma poder servir. A liderança
                usa essa informação ao montar as escalas.
              </CardDescription>
            </div>

            <Badge
              variant={totalSelectedPeriods > 0 ? "secondary" : "outline"}
              className="gap-1.5 self-start font-mono text-xs font-normal sm:self-center"
            >
              <CheckCircle2Icon
                className="size-3.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              {daysWithAnswer} de 7 dias informados
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!hasSavedOnce ? (
            <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <SparklesIcon
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-heading text-sm font-semibold text-foreground">
                  Primeira vez? Leva menos de um minuto.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Marque os períodos em que você pode servir e salve. Dias sem
                  resposta aparecem como{" "}
                  <span className="font-medium text-foreground">
                    “Não informado”
                  </span>{" "}
                  — nada é presumido sobre a sua disponibilidade.
                </p>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              {lastSavedAt
                ? `Última atualização em ${format(lastSavedAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}.`
                : "Sua disponibilidade ainda não foi salva."}
            </p>
          )}

          {/* Mobile: Botão de pré-definições que abre o Drawer */}
          <div className="sm:hidden">
            <Drawer open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full justify-between gap-2 rounded-xl bg-card/60 px-3.5 py-2.5 text-sm font-medium shadow-2xs hover:bg-muted/50 active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2">
                    <SparklesIcon
                      className="size-4 text-primary shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-foreground">
                      Pré-definições
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Atalhos rápidos
                    <ChevronRightIcon
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  </span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0 pb-safe sm:max-w-md sm:mx-auto">
                <DrawerHeader className="px-5 pt-4 pb-2 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <SparklesIcon className="size-4.5" aria-hidden="true" />
                    </div>
                    <div className="space-y-0.5">
                      <DrawerTitle className="font-heading text-lg font-semibold tracking-tight">
                        Pré-definições
                      </DrawerTitle>
                      <DrawerDescription className="text-xs text-muted-foreground">
                        Selecione um modelo para preencher seus horários da semana.
                      </DrawerDescription>
                    </div>
                  </div>
                </DrawerHeader>

                <div className="space-y-2 px-4 py-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={preset.action}
                      className="group flex w-full items-center gap-3.5 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-2xs transition-all hover:border-border hover:bg-muted/50 active:scale-[0.99] cursor-pointer"
                    >
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                          preset.iconColor,
                        )}
                      >
                        <preset.icon className="size-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {preset.label}
                        </p>
                        <p className="text-xs leading-tight text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                      <ChevronRightIcon
                        className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>

                <DrawerFooter className="px-4 pt-1 pb-6">
                  <DrawerClose asChild>
                    <Button variant="ghost" className="min-h-11 w-full">
                      Fechar
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Desktop: Atalhos inline */}
          <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Atalhos:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                applyWeekendPreset();
                toast.success("Pré-definição aplicada: Fins de semana.");
              }}
              className="min-h-11 gap-1.5"
            >
              <CalendarCheckIcon className="size-4" aria-hidden="true" />
              Fins de semana
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                applyWeeknightsPreset();
                toast.success("Pré-definição aplicada: Noites nos dias úteis.");
              }}
              className="min-h-11 gap-1.5"
            >
              <MoonIcon className="size-4" aria-hidden="true" />
              Noites nos dias úteis
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                clearAll();
                toast.info("Disponibilidade limpa.");
              }}
              className="min-h-11 gap-1.5 text-muted-foreground"
            >
              <RotateCcwIcon className="size-4" aria-hidden="true" />
              Limpar tudo
            </Button>
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Períodos:</span>
            {PERIODS.map((period, index) => (
              <span key={period.id} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-border">
                    ·
                  </span>
                ) : null}
                <span>
                  {period.label}{" "}
                  <span className="font-mono text-[11px]">
                    {period.hint.replace(" às ", "–")}
                  </span>
                </span>
              </span>
            ))}
          </p>

          {/* Days */}
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const currentDay = days.find(
                (value) => value.dayOfWeek === day.index,
              );
              if (!currentDay) return null;

              const selectedPeriods = currentDay.periods;
              const status = getDayStatus(currentDay);
              const hasAll = selectedPeriods.length === ALL_PERIODS.length;

              return (
                <div
                  key={day.index}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-3.5 shadow-xs transition-colors lg:flex-row lg:items-center lg:justify-between",
                    status === "available" && "border-primary/30 bg-primary/[0.02]",
                    status === "unavailable" &&
                      "border-amber-500/25 bg-amber-500/[0.04]",
                    status === "uninformed" && "bg-card hover:bg-muted/20",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-semibold text-foreground">
                      {day.label}
                    </span>

                    {status === "uninformed" ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs font-normal text-muted-foreground"
                      >
                        <CircleDashedIcon className="size-3" aria-hidden="true" />
                        Não informado
                      </Badge>
                    ) : status === "unavailable" ? (
                      <Badge className="gap-1 border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
                        <CalendarX2Icon className="size-3" aria-hidden="true" />
                        Indisponível
                      </Badge>
                    ) : (
                      <Badge className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2Icon
                          className="size-3"
                          aria-hidden="true"
                        />
                        Disponível
                      </Badge>
                    )}

                    {status === "available" ? (
                      <span className="text-xs text-muted-foreground">
                        {selectedPeriods.length} de 3 períodos
                      </span>
                    ) : null}
                  </div>

                  {/* Period buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PERIODS.map((period) => {
                      const isSelected = selectedPeriods.includes(period.id);
                      const Icon = period.icon;

                      return (
                        <button
                          key={period.id}
                          type="button"
                          onClick={() => togglePeriod(day.index, period.id)}
                          aria-pressed={isSelected}
                          aria-label={`${day.label}, ${period.label} (${period.hint})`}
                          title={`${period.label} · ${period.hint}`}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                          <span>{period.label}</span>
                        </button>
                      );
                    })}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWholeDay(day.index)}
                      aria-label={
                        hasAll
                          ? `Marcar ${day.label} como indisponível`
                          : `Marcar ${day.label} como disponível o dia todo`
                      }
                      title={
                        hasAll
                          ? "Limpar este dia"
                          : "Marcar o dia todo como disponível"
                      }
                      className="min-h-11 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {hasAll ? (
                        <CalendarX2Icon className="size-4" aria-hidden="true" />
                      ) : (
                        <CalendarCheckIcon
                          className="size-4"
                          aria-hidden="true"
                        />
                      )}
                      <span className="hidden sm:inline">
                        {hasAll ? "Limpar dia" : "Dia todo"}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* General Notes */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="generalNotes" className="text-sm font-medium">
                Observações ou restrições (opcional)
              </Label>
              <span className="font-mono text-xs text-muted-foreground">
                {generalNotes.length}/1000
              </span>
            </div>
            <Textarea
              id="generalNotes"
              placeholder="Ex.: 'Posso servir no 2º e 4º domingo de cada mês', 'No sábado só chego após as 18h', etc."
              value={generalNotes}
              onChange={(event) => setGeneralNotes(event.target.value)}
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Essas anotações ficam visíveis para a liderança durante o
              planejamento das escalas.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              Você pode alterar sua disponibilidade a qualquer momento.
            </span>
            <Button
              onClick={handleSave}
              disabled={!isDirty || isPending}
              className="min-h-11 w-full gap-2 sm:w-auto"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckIcon className="size-4" aria-hidden="true" />
              )}
              Salvar disponibilidade
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unsaved changes bar, kept above the mobile bottom navigation. */}
      {isDirty ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">
              Você tem alterações não salvas.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
                className="min-h-11"
              >
                Desfazer
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="min-h-11 gap-2"
              >
                {isPending ? (
                  <Loader2Icon
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckIcon className="size-4" aria-hidden="true" />
                )}
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isDirty ? <div className="h-20 md:h-16" aria-hidden="true" /> : null}
    </div>
  );
}

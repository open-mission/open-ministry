"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  Loader2Icon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  SunriseIcon,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AvailabilityPeriod } from "@/db/schema/people";
import { cn } from "@/lib/utils";

type AvailabilityEditorProps = {
  initialData: MyAvailabilityResult;
};

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
    hint: "Cultos das 06h às 12h",
  },
  {
    id: "afternoon",
    label: "Tarde",
    icon: SunIcon,
    hint: "Reuniões das 12h às 18h",
  },
  {
    id: "evening",
    label: "Noite",
    icon: MoonIcon,
    hint: "Cultos das 18h às 23h",
  },
];

export function AvailabilityEditor({ initialData }: AvailabilityEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState<DayAvailability[]>(initialData.days);
  const [generalNotes, setGeneralNotes] = useState(initialData.notes || "");

  function togglePeriod(dayIndex: number, period: AvailabilityPeriod) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayIndex) return d;
        const exists = d.periods.includes(period);
        const newPeriods = exists
          ? d.periods.filter((p) => p !== period)
          : [...d.periods, period];
        return { ...d, periods: newPeriods };
      }),
    );
  }

  function setAllPeriodsForDay(dayIndex: number, all: boolean) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayIndex) return d;
        return {
          ...d,
          periods: all ? ["morning", "afternoon", "evening"] : [],
        };
      }),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const res = await saveMyAvailabilityAction({
        days,
        generalNotes,
      });

      if (res.ok) {
        toast.success("Sua disponibilidade para servir foi salva com sucesso!");
      } else {
        toast.error(res.error || "Erro ao salvar disponibilidade.");
      }
    });
  }

  const totalSelectedPeriods = days.reduce(
    (acc, d) => acc + d.periods.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDaysIcon className="size-5" />
                </div>
                <CardTitle className="font-heading text-xl tracking-tight">
                  Disponibilidade para Servir
                </CardTitle>
              </div>
              <CardDescription>
                Informe em quais dias da semana e períodos você está disponível.
                Os líderes usarão essas informações ao montar a escala dos
                cultos.
              </CardDescription>
            </div>

            <Badge
              variant={totalSelectedPeriods > 0 ? "secondary" : "outline"}
              className="gap-1.5 self-start font-mono text-xs font-normal sm:self-center"
            >
              <CheckCircle2Icon className="size-3.5 text-emerald-500" />
              {totalSelectedPeriods}{" "}
              {totalSelectedPeriods === 1 ? "período ativo" : "períodos ativos"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Legend and explanation */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Períodos do dia:</span>
            {PERIODS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-primary" />
                  <span>
                    <strong>{p.label}</strong> ({p.hint})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Days Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {DAYS_OF_WEEK.map((day) => {
              const currentDay = days.find((d) => d.dayOfWeek === day.index);
              const selectedPeriods = currentDay?.periods || [];
              const hasAll = selectedPeriods.length === 3;
              const hasNone = selectedPeriods.length === 0;

              return (
                <div
                  key={day.index}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between shadow-xs",
                    selectedPeriods.length > 0
                      ? "border-primary/30 bg-primary/2"
                      : "bg-card hover:bg-muted/20",
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-foreground">
                        {day.label}
                      </span>
                      {hasNone ? (
                        <span className="text-[11px] text-muted-foreground italic">
                          Indisponível
                        </span>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px]"
                        >
                          {selectedPeriods.length === 3
                            ? "Dia todo"
                            : `${selectedPeriods.length} ${
                                selectedPeriods.length === 1
                                  ? "período"
                                  : "períodos"
                              }`}
                        </Badge>
                      )}
                    </div>
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
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          title={`${day.label} (${period.label})`}
                        >
                          <Icon className="size-3.5" />
                          <span>{period.label}</span>
                        </button>
                      );
                    })}

                    {/* Quick day actions */}
                    <div className="ml-1 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setAllPeriodsForDay(day.index, !hasAll)}
                        title={
                          hasAll
                            ? "Limpar este dia"
                            : "Marcar o dia todo como disponível"
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <SparklesIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* General Notes */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="generalNotes" className="text-sm font-medium">
              Observações ou restrições (opcional)
            </Label>
            <Textarea
              id="generalNotes"
              placeholder="Ex.: 'Posso servir no 2º e 4º domingo de cada mês', 'No sábado só chego após as 18h', etc."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Essas anotações ficam visíveis para a liderança durante o
              planejamento das escalas.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              Você pode alterar sua disponibilidade a qualquer momento.
            </span>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="w-full gap-2 sm:w-auto"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Salvar disponibilidade
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

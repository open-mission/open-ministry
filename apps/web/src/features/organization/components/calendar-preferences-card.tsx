"use client";

import { useState, useTransition } from "react";
import { CalendarIcon, CheckIcon, GlobeIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { saveCalendarPreferencesAction } from "@/app/actions/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COMMON_TIMEZONES, type CalendarPreferences } from "@/lib/calendar";

type CalendarPreferencesCardProps = {
  initialPreferences: CalendarPreferences;
};

export function CalendarPreferencesCard({
  initialPreferences,
}: CalendarPreferencesCardProps) {
  const [isPending, startTransition] = useTransition();
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(
    initialPreferences.weekStartsOn,
  );
  const [timezone, setTimezone] = useState(initialPreferences.timezone);

  function handleSave() {
    startTransition(async () => {
      const res = await saveCalendarPreferencesAction({
        weekStartsOn,
        timezone,
      });

      if (res.ok) {
        toast.success("Preferências de calendário atualizadas com sucesso!");
      } else {
        toast.error(res.error || "Erro ao salvar preferências.");
      }
    });
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-xl tracking-tight">
              Agenda & Calendário
            </CardTitle>
            <CardDescription>
              Configure o primeiro dia da semana e o fuso horário para exibição
              dos cultos, escalas e eventos.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2.5">
          <Label className="text-sm font-medium">Início da semana</Label>
          <RadioGroup
            value={String(weekStartsOn)}
            onValueChange={(val) => setWeekStartsOn(Number(val) as 0 | 1)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
              <RadioGroupItem value="0" id="card-week-sun" />
              <Label
                htmlFor="card-week-sun"
                className="cursor-pointer text-sm font-medium"
              >
                Domingo (padrão)
              </Label>
            </div>

            <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
              <RadioGroupItem value="1" id="card-week-mon" />
              <Label
                htmlFor="card-week-mon"
                className="cursor-pointer text-sm font-medium"
              >
                Segunda-feira
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <GlobeIcon className="size-4 text-muted-foreground" />
            <Label htmlFor="card-tz" className="text-sm font-medium">
              Fuso Horário
            </Label>
          </div>
          <NativeSelect
            id="card-tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full [&_select]:h-10 text-xs sm:text-sm"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <NativeSelectOption key={tz.value} value={tz.value}>
                {tz.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            Todos os horários de cultos, cronogramas e escalas serão calculados
            com base neste fuso horário.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Salvar preferências
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

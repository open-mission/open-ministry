"use client";

import { useState, useTransition } from "react";
import { GlobeIcon, Loader2Icon, Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import { saveCalendarPreferencesAction } from "@/app/actions/calendar";
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
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { COMMON_TIMEZONES, type CalendarPreferences } from "@/lib/calendar";

type CalendarPreferencesDialogProps = {
  preferences: CalendarPreferences;
  onPreferencesChange?: (preferences: CalendarPreferences) => void;
  trigger?: React.ReactNode;
};

export function CalendarPreferencesDialog({
  preferences,
  onPreferencesChange,
  trigger,
}: CalendarPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(
    preferences.weekStartsOn,
  );
  const [timezone, setTimezone] = useState(preferences.timezone);

  function handleSave() {
    startTransition(async () => {
      const res = await saveCalendarPreferencesAction({
        weekStartsOn,
        timezone,
      });

      if (res.ok) {
        toast.success("Preferências de calendário atualizadas!");
        onPreferencesChange?.({ weekStartsOn, timezone });
        setOpen(false);
      } else {
        toast.error(res.error || "Erro ao salvar preferências.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="size-7 p-0 sm:h-7 sm:w-auto sm:px-2.5 gap-1.5 text-xs font-medium shrink-0"
            title="Configurações da Agenda"
            aria-label="Configurações da Agenda"
          >
            <Settings2Icon className="size-3.5" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
            <GlobeIcon className="size-5 text-primary" />
            Preferências da Agenda
          </DialogTitle>
          <DialogDescription>
            Defina o primeiro dia da semana e o fuso horário para a exibição de
            cultos e escalas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Week starts on */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Início da semana</Label>
            <RadioGroup
              value={String(weekStartsOn)}
              onValueChange={(val) => setWeekStartsOn(Number(val) as 0 | 1)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="0" id="week-sun" />
                <Label
                  htmlFor="week-sun"
                  className="cursor-pointer text-sm font-medium"
                >
                  Domingo
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="1" id="week-mon" />
                <Label
                  htmlFor="week-mon"
                  className="cursor-pointer text-sm font-medium"
                >
                  Segunda-feira
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="calendar-tz" className="text-sm font-medium">
              Fuso Horário
            </Label>
            <NativeSelect
              id="calendar-tz"
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
              Os horários de todos os cultos e compromissos serão adaptados para
              o fuso selecionado.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Salvar preferências
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

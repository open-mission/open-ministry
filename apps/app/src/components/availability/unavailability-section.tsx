"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarOffIcon,
  CalendarPlusIcon,
  Loader2Icon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  SunriseIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteUnavailabilityAction,
  saveUnavailabilityAction,
} from "@/app/actions/availability";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvailabilityPeriod } from "@/db/schema/people";
import type { PersonUnavailabilityItem } from "@/lib/availability";
import { cn } from "@/lib/utils";

type UnavailabilitySectionProps = {
  initialItems: PersonUnavailabilityItem[];
};

const PERIOD_CONFIG: {
  id: AvailabilityPeriod;
  label: string;
  icon: typeof SunIcon;
}[] = [
  { id: "morning", label: "Manhã", icon: SunriseIcon },
  { id: "afternoon", label: "Tarde", icon: SunIcon },
  { id: "evening", label: "Noite", icon: MoonIcon },
];

function sortByDate(items: PersonUnavailabilityItem[]) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

function formatDisplayDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });
  } catch {
    return dateStr;
  }
}

export function UnavailabilitySection({
  initialItems,
}: UnavailabilitySectionProps) {
  const [items, setItems] = useState<PersonUnavailabilityItem[]>(() =>
    sortByDate(initialItems),
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [selectedPeriods, setSelectedPeriods] = useState<AvailabilityPeriod[]>(
    [],
  );

  const today = format(new Date(), "yyyy-MM-dd");

  function resetForm() {
    setDate("");
    setReason("");
    setAllDay(true);
    setSelectedPeriods([]);
  }

  function handleDialogChange(open: boolean) {
    if (open) resetForm();
    setIsDialogOpen(open);
  }

  function togglePeriod(period: AvailabilityPeriod) {
    setSelectedPeriods((prev) =>
      prev.includes(period)
        ? prev.filter((value) => value !== period)
        : [...prev, period],
    );
  }

  function handleSave() {
    if (!date) {
      toast.error("Selecione a data do bloqueio.");
      return;
    }

    if (!allDay && selectedPeriods.length === 0) {
      toast.error("Selecione ao menos um período ou marque o dia todo.");
      return;
    }

    startTransition(async () => {
      const res = await saveUnavailabilityAction({
        date,
        reason,
        allDay,
        periods: allDay ? [] : selectedPeriods,
      });

      if (res.ok) {
        setItems((prev) =>
          sortByDate([
            ...prev.filter(
              (item) => item.id !== res.item.id && item.date !== res.item.date,
            ),
            res.item,
          ]),
        );
        setIsDialogOpen(false);
        toast.success(
          res.updated
            ? "Data de indisponibilidade atualizada."
            : "Data de indisponibilidade registrada.",
        );
      } else {
        toast.error(res.error || "Erro ao registrar indisponibilidade.");
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteUnavailabilityAction(id);
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast.success(
          res.deleted
            ? "Data de indisponibilidade removida."
            : "Essa data já não estava registrada.",
        );
      } else {
        toast.error(res.error || "Erro ao remover indisponibilidade.");
      }
      setDeletingId(null);
    });
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl tracking-tight">
              Datas específicas de indisponibilidade
            </CardTitle>
            <CardDescription>
              Bloqueie dias pontuais de viagem, trabalho ou imprevistos em que
              você não poderá servir.
            </CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 gap-1.5 self-start sm:self-center"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                Adicionar data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
                  <CalendarPlusIcon
                    className="size-5 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  Registrar indisponibilidade
                </DialogTitle>
                <DialogDescription>
                  Informe o dia e, se quiser, o motivo. A liderança verá o
                  bloqueio ao montar as escalas.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="block-date">Data da ausência</Label>
                  <Input
                    id="block-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-11"
                    min={today}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="block-reason">
                      Motivo ou observação (opcional)
                    </Label>
                    <span className="font-mono text-xs text-muted-foreground">
                      {reason.length}/200
                    </span>
                  </div>
                  <Input
                    id="block-reason"
                    placeholder="Ex.: Viagem de família, plantão no trabalho…"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="h-11"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="allDayCheckbox"
                      checked={allDay}
                      onCheckedChange={(checked) =>
                        setAllDay(Boolean(checked))
                      }
                    />
                    <Label
                      htmlFor="allDayCheckbox"
                      className="cursor-pointer text-sm font-medium leading-none"
                    >
                      Indisponível o dia todo
                    </Label>
                  </div>

                  {!allDay ? (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-muted-foreground">
                        Selecione os períodos de ausência:
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {PERIOD_CONFIG.map((period) => {
                          const Icon = period.icon;
                          const isSelected = selectedPeriods.includes(
                            period.id,
                          );
                          return (
                            <button
                              key={period.id}
                              type="button"
                              onClick={() => togglePeriod(period.id)}
                              aria-pressed={isSelected}
                              className={cn(
                                "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isSelected
                                  ? "border-amber-500 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              <Icon className="size-4" aria-hidden="true" />
                              {period.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                  className="min-h-11"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isPending}
                  className="min-h-11 gap-2"
                >
                  {isPending ? (
                    <Loader2Icon
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  {isPending ? "Salvando…" : "Confirmar bloqueio"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarOffIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Nenhuma data bloqueada
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Sua escala seguirá normalmente os dias e períodos que você
                informou acima.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDialogChange(true)}
              className="mt-1 min-h-11 gap-1.5"
            >
              <PlusIcon className="size-4" aria-hidden="true" />
              Registrar data
            </Button>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {items.map((item) => {
              const isDeleting = deletingId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-semibold capitalize text-foreground">
                        {formatDisplayDate(item.date)}
                      </span>
                      {item.allDay ? (
                        <Badge className="border-amber-500/20 bg-amber-500/10 font-mono text-xs text-amber-700 dark:text-amber-300">
                          Dia todo
                        </Badge>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {item.periods.map((period) => {
                            const found = PERIOD_CONFIG.find(
                              (config) => config.id === period,
                            );
                            return (
                              <Badge
                                key={period}
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {found?.label || period}
                              </Badge>
                            );
                          })}
                        </span>
                      )}
                    </div>
                    {item.reason ? (
                      <p className="text-xs text-muted-foreground">
                        Motivo:{" "}
                        <span className="text-foreground/90">{item.reason}</span>
                      </p>
                    ) : null}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        className="min-h-11 gap-1.5 self-end text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:self-center"
                        aria-label={`Remover indisponibilidade de ${formatDisplayDate(item.date)}`}
                      >
                        {isDeleting ? (
                          <Loader2Icon
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2Icon className="size-4" aria-hidden="true" />
                        )}
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogMedia>
                          <Trash2Icon className="text-destructive" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>
                          Remover esta indisponibilidade?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          O bloqueio de {formatDisplayDate(item.date)} será
                          removido. Você poderá registrá-lo novamente depois.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter data</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

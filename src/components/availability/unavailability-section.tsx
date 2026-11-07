"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarOffIcon,
  CalendarPlusIcon,
  CalendarX2Icon,
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

export function UnavailabilitySection({
  initialItems,
}: UnavailabilitySectionProps) {
  const [items, setItems] = useState<PersonUnavailabilityItem[]>(initialItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [selectedPeriods, setSelectedPeriods] = useState<AvailabilityPeriod[]>([]);

  function togglePeriod(period: AvailabilityPeriod) {
    setSelectedPeriods((prev) =>
      prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period],
    );
  }

  function handleOpenDialog() {
    setDate("");
    setReason("");
    setAllDay(true);
    setSelectedPeriods([]);
    setIsDialogOpen(true);
  }

  function handleSave() {
    if (!date) {
      toast.error("Por favor, selecione a data do bloqueio.");
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
        toast.success("Data de indisponibilidade registrada com sucesso!");
        setIsDialogOpen(false);
        // Optimistically update list
        setItems((prev) => {
          const filtered = prev.filter((item) => item.date !== date);
          const newItem: PersonUnavailabilityItem = {
            id: `temp-${Date.now()}`,
            organizationId: "",
            personId: "",
            date,
            reason: reason.trim() || null,
            allDay,
            periods: allDay ? [] : selectedPeriods,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return [...filtered, newItem].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
        });
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
        toast.success("Bloqueio removido.");
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error(res.error || "Erro ao remover bloqueio.");
      }
      setDeletingId(null);
    });
  }

  function formatDisplayDate(dateStr: string) {
    try {
      const parsed = parseISO(dateStr);
      return format(parsed, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CalendarX2Icon className="size-5" />
              </div>
              <CardTitle className="font-heading text-xl tracking-tight">
                Datas Específicas de Indisponibilidade
              </CardTitle>
            </div>
            <CardDescription>
              Marque dias pontuais em que você terá viagens, compromissos ou
              imprevistos e não poderá servir no ministério.
            </CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenDialog}
                className="gap-1.5 self-start sm:self-center"
              >
                <PlusIcon className="size-4" />
                Adicionar data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl tracking-tight">
                  <CalendarPlusIcon className="size-5 text-amber-500" />
                  Registrar Indisponibilidade
                </DialogTitle>
                <DialogDescription>
                  Informe o dia e o motivo da sua ausência. Os líderes verão
                  esse aviso ao montar as escalas.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="block-date">Data da ausência</Label>
                  <Input
                    id="block-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10"
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="block-reason">
                    Motivo ou observação (opcional)
                  </Label>
                  <Input
                    id="block-reason"
                    placeholder="Ex.: Viagem de família, plantão no trabalho, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-10"
                    maxLength={150}
                  />
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allDayCheckbox"
                      checked={allDay}
                      onCheckedChange={(checked) => setAllDay(Boolean(checked))}
                    />
                    <Label
                      htmlFor="allDayCheckbox"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Indisponível o dia todo
                    </Label>
                  </div>

                  {!allDay ? (
                    <div className="pt-2">
                      <Label className="text-xs text-muted-foreground">
                        Selecione os períodos de ausência:
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PERIOD_CONFIG.map((p) => {
                          const Icon = p.icon;
                          const isSelected = selectedPeriods.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => togglePeriod(p.id)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                                isSelected
                                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:bg-muted",
                              )}
                            >
                              <Icon className="size-3.5" />
                              {p.label}
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
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isPending}
                  className="gap-2"
                >
                  {isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Confirmar bloqueio
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 px-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarOffIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Nenhuma data de ausência registrada
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground max-w-sm">
                Sua escala seguirá normalmente os dias da semana e horários que você
                configurou acima.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDialog}
              className="mt-1 gap-1.5"
            >
              <PlusIcon className="size-3.5" />
              Registrar ausência pontual
            </Button>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {items.map((item) => {
              const isDeleting = deletingId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/10"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-semibold capitalize text-foreground">
                        {formatDisplayDate(item.date)}
                      </span>
                      {item.allDay ? (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] text-amber-700 bg-amber-500/10 dark:text-amber-300 border-amber-500/20"
                        >
                          Dia todo
                        </Badge>
                      ) : (
                        <div className="flex gap-1">
                          {item.periods.map((p) => {
                            const found = PERIOD_CONFIG.find((c) => c.id === p);
                            return (
                              <Badge
                                key={p}
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {found?.label || p}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {item.reason ? (
                      <p className="text-xs text-muted-foreground">
                        Motivo: <span className="text-foreground/90">{item.reason}</span>
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending || isDeleting}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 self-end sm:self-center gap-1.5"
                    title="Remover indisponibilidade"
                  >
                    {isDeleting ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-3.5" />
                    )}
                    <span className="text-xs">Remover</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

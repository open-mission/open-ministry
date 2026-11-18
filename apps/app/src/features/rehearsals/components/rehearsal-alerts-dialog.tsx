"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellRingIcon,
  Loader2Icon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  resetRehearsalAlertRulesAction,
  saveRehearsalAlertRulesAction,
} from "@/app/actions/rehearsals";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  describeOffsetMinutes,
  formatAlertRuleSummary,
  REHEARSAL_CHANNELS,
  REHEARSAL_CHANNEL_LABELS,
  type RehearsalChannel,
} from "@/features/rehearsals/lib/rehearsal-ui";
import { useIsMobile } from "@/hooks/use-mobile";

export type RehearsalAlertRuleRow = {
  id?: string | null;
  label: string;
  triggerType: "offset_minutes" | "day_of_at_time";
  offsetMinutes?: number | null;
  timeOfDay?: string | null;
  channels: string[];
  enabled?: boolean;
};

type DraftRule = {
  id: string | null;
  label: string;
  triggerType: "offset_minutes" | "day_of_at_time";
  offsetMinutes: number;
  timeOfDay: string;
  channels: RehearsalChannel[];
  enabled: boolean;
};

type RehearsalAlertsDialogProps = {
  departmentId: string;
  departmentName: string;
  rules: RehearsalAlertRuleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
};

function toDraftRules(rules: RehearsalAlertRuleRow[]): DraftRule[] {
  return rules.map((rule) => {
    const channels = rule.channels.filter((channel): channel is RehearsalChannel =>
      (REHEARSAL_CHANNELS as readonly string[]).includes(channel),
    );

    return {
      id: rule.id ?? null,
      label: rule.label,
      triggerType: rule.triggerType,
      offsetMinutes: rule.offsetMinutes ?? 0,
      timeOfDay: rule.timeOfDay ?? "08:00",
      channels: channels.length > 0 ? channels : ["in_app"],
      enabled: rule.enabled ?? true,
    };
  });
}

export function RehearsalAlertsDialog({
  departmentId,
  departmentName,
  rules,
  open,
  onOpenChange,
  canManage,
}: RehearsalAlertsDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftRule[]>(() => toDraftRules(rules));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recarrega as regras sempre que o diálogo abre (render-phase).
  const formSyncKey = open ? "open" : "closed";
  const [prevFormSyncKey, setPrevFormSyncKey] = useState(formSyncKey);

  if (formSyncKey !== prevFormSyncKey) {
    setPrevFormSyncKey(formSyncKey);
    if (open) {
      setDraft(toDraftRules(rules));
      setError(null);
    }
  }

  const updateRule = (index: number, patch: Partial<DraftRule>) => {
    setDraft((current) =>
      current.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  };

  const toggleChannel = (index: number, channel: RehearsalChannel) => {
    setDraft((current) =>
      current.map((rule, ruleIndex) => {
        if (ruleIndex !== index) return rule;
        const hasChannel = rule.channels.includes(channel);
        return {
          ...rule,
          channels: hasChannel
            ? rule.channels.filter((item) => item !== channel)
            : [...rule.channels, channel],
        };
      }),
    );
  };

  const handleSave = async () => {
    if (!canManage) return;

    if (draft.some((rule) => rule.channels.length === 0)) {
      setError("Selecione pelo menos um canal em cada lembrete.");
      return;
    }

    if (draft.some((rule) => !rule.label.trim())) {
      setError("Preencha o nome de todos os lembretes.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const payload = draft.map((rule) => ({
        id: rule.id ?? undefined,
        label: rule.label.trim(),
        triggerType: rule.triggerType,
        offsetMinutes:
          rule.triggerType === "offset_minutes" ? rule.offsetMinutes : null,
        timeOfDay:
          rule.triggerType === "day_of_at_time" ? rule.timeOfDay : null,
        channels: rule.channels,
        enabled: rule.enabled,
      }));

      const result = await saveRehearsalAlertRulesAction(departmentId, payload);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setDraft(toDraftRules(result.data));
      toast.success("Lembretes do departamento atualizados.");
      startTransition(() => router.refresh());
      onOpenChange(false);
    } catch {
      const message = "Não foi possível salvar os lembretes.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!canManage) return;
    setError(null);
    setResetting(true);

    try {
      const result = await resetRehearsalAlertRulesAction(departmentId);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setDraft(toDraftRules(result.data));
      toast.success("Lembretes restaurados para o padrão.");
      startTransition(() => router.refresh());
    } catch {
      const message = "Não foi possível restaurar os lembretes.";
      setError(message);
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  const busy = saving || resetting;

  const body = (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Estes lembretes valem para todos os ensaios de{" "}
        <span className="font-medium text-foreground">{departmentName}</span>.
      </p>

      <div className="space-y-3">
        {draft.map((rule, index) => (
          <div
            key={rule.id ?? `rule-${index}`}
            className="space-y-3 rounded-xl border border-border/70 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`alert-label-${index}`} className="text-xs">
                  Nome do lembrete
                </Label>
                <Input
                  id={`alert-label-${index}`}
                  value={rule.label}
                  onChange={(event) =>
                    updateRule(index, { label: event.target.value })
                  }
                  maxLength={120}
                  disabled={!canManage || busy}
                  className="h-11 sm:h-9"
                />
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5 pt-5">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) =>
                    updateRule(index, { enabled: checked })
                  }
                  disabled={!canManage || busy}
                  aria-label={`Ativar ${rule.label}`}
                />
                <span className="text-[11px] text-muted-foreground">
                  {rule.enabled ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`alert-trigger-${index}`} className="text-xs">
                  Quando avisar
                </Label>
                <NativeSelect
                  id={`alert-trigger-${index}`}
                  value={rule.triggerType}
                  onChange={(event) =>
                    updateRule(index, {
                      triggerType: event.target.value as DraftRule["triggerType"],
                    })
                  }
                  disabled={!canManage || busy}
                  className="w-full [&_select]:h-11 sm:[&_select]:h-9"
                >
                  <option value="offset_minutes">Antes do ensaio</option>
                  <option value="day_of_at_time">No dia, em um horário</option>
                </NativeSelect>
              </div>

              {rule.triggerType === "offset_minutes" ? (
                <div className="space-y-1.5">
                  <Label htmlFor={`alert-offset-${index}`} className="text-xs">
                    Minutos de antecedência
                  </Label>
                  <Input
                    id={`alert-offset-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10080}
                    step={15}
                    value={rule.offsetMinutes}
                    onChange={(event) =>
                      updateRule(index, {
                        offsetMinutes: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                    disabled={!canManage || busy}
                    className="h-11 sm:h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {describeOffsetMinutes(rule.offsetMinutes)}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor={`alert-time-${index}`} className="text-xs">
                    Horário do dia
                  </Label>
                  <Input
                    id={`alert-time-${index}`}
                    type="time"
                    value={rule.timeOfDay}
                    onChange={(event) =>
                      updateRule(index, { timeOfDay: event.target.value })
                    }
                    disabled={!canManage || busy}
                    className="h-11 sm:h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    No dia do ensaio, às {rule.timeOfDay || "08:00"}
                  </p>
                </div>
              )}
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-medium">Canais</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {REHEARSAL_CHANNELS.map((channel) => {
                  const checkboxId = `alert-${index}-${channel}`;
                  const checked = rule.channels.includes(channel);
                  return (
                    <label
                      key={channel}
                      htmlFor={checkboxId}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2.5 text-xs sm:min-h-9"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        onCheckedChange={() => toggleChannel(index, channel)}
                        disabled={!canManage || busy}
                      />
                      <span className="truncate">
                        {REHEARSAL_CHANNEL_LABELS[channel]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <p className="text-[11px] text-muted-foreground">
              {formatAlertRuleSummary(rule)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleReset}
        disabled={!canManage || busy}
        className="min-h-11 shrink-0"
      >
        {resetting ? (
          <Loader2Icon className="mr-2 size-4 animate-spin" />
        ) : (
          <RotateCcwIcon data-icon="inline-start" />
        )}
        Restaurar padrão
      </Button>
      <Button
        type="button"
        onClick={handleSave}
        disabled={!canManage || busy || draft.length === 0}
        className="min-h-11 flex-1 sm:flex-none"
      >
        {saving ? (
          <Loader2Icon className="mr-2 size-4 animate-spin" />
        ) : (
          <SaveIcon data-icon="inline-start" />
        )}
        Salvar lembretes
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[88dvh] max-h-[88dvh] flex-col gap-0 rounded-t-[24px] p-0">
          <DrawerHeader className="shrink-0 border-b px-4 pt-3 pb-3 !text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle className="flex items-center gap-2 font-heading text-xl">
              <BellRingIcon className="size-5 text-primary" />
              Lembretes de ensaio
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Configure quando e por quais canais a equipe será avisada.
            </DrawerDescription>
          </DrawerHeader>

          <div
            data-vaul-no-drag=""
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-3.5 [-webkit-overflow-scrolling:touch]"
          >
            {body}
          </div>

          <DrawerFooter className="shrink-0 flex-row items-center gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl">
            <BellRingIcon className="size-5 text-primary" />
            Lembretes de ensaio
          </DialogTitle>
          <DialogDescription>
            Configure quando e por quais canais a equipe será avisada sobre os
            ensaios de {departmentName}.
          </DialogDescription>
        </DialogHeader>

        {body}

        <DialogFooter className="flex-wrap gap-2 pt-2 sm:justify-end">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

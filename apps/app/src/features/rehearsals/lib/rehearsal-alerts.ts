import { toZonedTime } from "date-fns-tz";

import { EVENT_TIME_ZONE } from "@/lib/plan-utils";
import { zonedDateTimeToUtc } from "@/lib/recurrence-utils";

export type RehearsalAlertTriggerType = "offset_minutes" | "day_of_at_time";

export type RehearsalAlertRule = {
  id?: string | null;
  label: string;
  triggerType: RehearsalAlertTriggerType;
  offsetMinutes?: number | null;
  timeOfDay?: string | null;
  channels: string[];
  enabled?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

export const DEFAULT_REHEARSAL_ALERTS: RehearsalAlertRule[] = [
  {
    label: "2 dias antes",
    triggerType: "offset_minutes",
    offsetMinutes: 2880,
    timeOfDay: null,
    channels: ["in_app", "push"],
    enabled: true,
    isDefault: true,
    sortOrder: 0,
  },
  {
    label: "No dia do ensaio (08:00)",
    triggerType: "day_of_at_time",
    offsetMinutes: null,
    timeOfDay: "08:00",
    channels: ["in_app", "push"],
    enabled: true,
    isDefault: true,
    sortOrder: 1,
  },
  {
    label: "No horário do ensaio",
    triggerType: "offset_minutes",
    offsetMinutes: 0,
    timeOfDay: null,
    channels: ["in_app", "push"],
    enabled: true,
    isDefault: true,
    sortOrder: 2,
  },
];

/** Janela de tolerância para não descartar lembretes que venceram agora. */
export const REHEARSAL_REMINDER_GRACE_MS = 2 * 60 * 1000;

function normalizeTimeOfDay(value: string | null | undefined): string {
  if (!value) return "08:00";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return "08:00";

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Calcula o instante UTC em que um lembrete deve ser disparado.
 *
 * - `offset_minutes`: N minutos antes do início do ensaio.
 * - `day_of_at_time`: no mesmo dia civil do ensaio em America/Sao_Paulo,
 *   no horário local informado (HH:mm).
 */
export function computeReminderTimestamp(
  startsAt: Date,
  rule: Pick<
    RehearsalAlertRule,
    "triggerType" | "offsetMinutes" | "timeOfDay"
  >,
): Date {
  if (rule.triggerType === "day_of_at_time") {
    const zoned = toZonedTime(startsAt, EVENT_TIME_ZONE);
    const year = zoned.getFullYear();
    const month = String(zoned.getMonth() + 1).padStart(2, "0");
    const day = String(zoned.getDate()).padStart(2, "0");

    return zonedDateTimeToUtc(
      `${year}-${month}-${day}`,
      normalizeTimeOfDay(rule.timeOfDay),
    );
  }

  const offsetMinutes = rule.offsetMinutes ?? 0;
  return new Date(startsAt.getTime() - offsetMinutes * 60 * 1000);
}

export type RehearsalReminderPlan = {
  alertRuleId: string | null;
  label: string;
  scheduledFor: Date;
  channels: string[];
  dedupeKey: string;
};

export type RehearsalReminderInput = {
  id: string;
  organizationId: string;
  departmentId: string;
  startsAt: Date;
};

function ruleDedupePart(rule: RehearsalAlertRule): string {
  if (rule.id) return rule.id;
  if (rule.triggerType === "day_of_at_time") {
    return `day:${normalizeTimeOfDay(rule.timeOfDay)}`;
  }
  return `offset:${rule.offsetMinutes ?? 0}`;
}

/**
 * Constrói, de forma pura e determinística, os lembretes futuros de um ensaio.
 * Lembretes vencidos há mais de 2 minutos são descartados.
 */
export function buildRehearsalRemindersToSchedule(
  input: RehearsalReminderInput,
  rules: RehearsalAlertRule[],
  now: Date = new Date(),
): RehearsalReminderPlan[] {
  const cutoff = now.getTime() - REHEARSAL_REMINDER_GRACE_MS;

  return rules
    .filter((rule) => rule.enabled !== false)
    .map((rule) => {
      const scheduledFor = computeReminderTimestamp(input.startsAt, rule);
      const dedupeKey = [
        "rehearsal",
        input.id,
        ruleDedupePart(rule),
        scheduledFor.toISOString(),
      ].join(":");

      return {
        alertRuleId: rule.id ?? null,
        label: rule.label,
        scheduledFor,
        channels: [...rule.channels],
        dedupeKey,
      };
    })
    .filter((plan) => plan.scheduledFor.getTime() >= cutoff)
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

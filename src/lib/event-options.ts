export const EVENT_KINDS = ["service", "event"] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const eventKindLabels: Record<EventKind, string> = {
  service: "Culto",
  event: "Evento",
};

export const RECURRENCE_OPTIONS = [
  "none",
  "weekly",
  "biweekly",
  "monthly",
  "custom",
] as const;

export type RecurrenceOption = (typeof RECURRENCE_OPTIONS)[number];

export const recurrenceLabels: Record<RecurrenceOption, string> = {
  none: "Não repete",
  weekly: "Toda semana",
  biweekly: "A cada duas semanas",
  monthly: "Todo mês",
  custom: "Personalizado",
};

export function isEventKind(value: string): value is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

export function isRecurrenceOption(
  value: string,
): value is RecurrenceOption {
  return (RECURRENCE_OPTIONS as readonly string[]).includes(value);
}

import type { CalendarItem } from "@/lib/calendar";

/** Ensaios são eventos de tipo "rehearsal" ou marcados com a cor roxa. */
export function isRehearsalItem(item: CalendarItem): boolean {
  return item.metadata?.eventKind === "rehearsal" || item.color === "purple";
}

/** Classe da cor de destaque (barra/ponto) de cada tipo de compromisso. */
export function getItemAccent(item: CalendarItem): string {
  if (item.type === "assignment") return "bg-chart-1";
  if (item.type === "unavailability") return "bg-chart-2";
  if (item.type === "birthday") return "bg-chart-5";
  if (isRehearsalItem(item)) return "bg-chart-4";
  return "bg-primary";
}

export function getItemTypeLabel(item: CalendarItem): string {
  if (item.type === "assignment") return "Minha escala";
  if (item.type === "unavailability") return "Indisponibilidade";
  if (item.type === "birthday") return "Aniversário";
  if (isRehearsalItem(item)) return "Ensaio";
  return "Culto ou evento";
}

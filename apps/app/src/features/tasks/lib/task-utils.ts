import { isPast, isToday, isTomorrow, isYesterday, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { TaskPriority, TaskStatus } from "../services/tasks-service";

export function formatTaskWhen(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  const timePart = format(d, "HH:mm");
  const hasSpecificTime = timePart !== "00:00";

  if (isToday(d)) {
    return hasSpecificTime ? `Hoje às ${timePart}` : "Hoje";
  }
  if (isTomorrow(d)) {
    return hasSpecificTime ? `Amanhã às ${timePart}` : "Amanhã";
  }
  if (isYesterday(d)) {
    return hasSpecificTime ? `Ontem às ${timePart}` : "Ontem";
  }

  const dateFormatted = format(d, "EEE, d 'de' MMM", { locale: ptBR });
  return hasSpecificTime ? `${dateFormatted} às ${timePart}` : dateFormatted;
}

export function formatTaskDeadline(
  deadline: Date | string | null | undefined,
  completed = false,
): { label: string; isOverdue: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;

  const isOverdue = !completed && isPast(d) && !isToday(d);
  const timePart = format(d, "HH:mm");
  const hasSpecificTime = timePart !== "00:00" && timePart !== "23:59";

  let dateLabel = format(d, "d 'de' MMM", { locale: ptBR });
  if (isToday(d)) {
    dateLabel = "Hoje";
  } else if (isTomorrow(d)) {
    dateLabel = "Amanhã";
  }

  const label = hasSpecificTime ? `${dateLabel} às ${timePart}` : dateLabel;

  return {
    label,
    isOverdue,
  };
}

export function getStatusLabel(status: TaskStatus | string): string {
  switch (status) {
    case "todo":
      return "A Fazer";
    case "in_progress":
      return "Em Andamento";
    case "completed":
      return "Concluída";
    case "canceled":
      return "Cancelada";
    default:
      return status;
  }
}

export function getPriorityLabel(priority: TaskPriority | string): string {
  switch (priority) {
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return "Normal";
  }
}

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPriorityLabel, getStatusLabel } from "./task-utils";

const WEEKDAY_NAMES: Record<string, string> = {
  "0": "todo domingo",
  "1": "toda segunda-feira",
  "2": "toda terça-feira",
  "3": "toda quarta-feira",
  "4": "toda quinta-feira",
  "5": "toda sexta-feira",
  "6": "todo sábado",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Converte Date ou string ISO em "YYYY-MM-DDTHH:mm" no fuso local do navegador,
 * evitando o deslocamento de +3h causado por .toISOString().slice(0, 16).
 */
export function formatDateTimeLocalInput(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Calcula valores rápidos para preenchimento de prazo no formulário em hora local.
 */
export function getQuickDeadlineInput(
  preset: "today" | "tomorrow" | "sunday",
  now: Date = new Date(),
): string {
  const target = new Date(now);
  target.setSeconds(0, 0);

  if (preset === "today") {
    if (target.getHours() >= 18) {
      target.setHours(23, 59, 0, 0);
    } else {
      target.setHours(18, 0, 0, 0);
    }
    return formatDateTimeLocalInput(target);
  }

  if (preset === "tomorrow") {
    target.setDate(target.getDate() + 1);
    target.setHours(18, 0, 0, 0);
    return formatDateTimeLocalInput(target);
  }

  // Próximo domingo
  const day = target.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  target.setDate(target.getDate() + daysUntilSunday);
  target.setHours(9, 0, 0, 0);
  return formatDateTimeLocalInput(target);
}

/**
 * Lê uma regra de recorrência semanal (ex: "FREQ=WEEKLY;BYDAY=3;BYTIME=09:00").
 */
export function parseRecurrenceRule(rule: string | null | undefined): {
  enabled: boolean;
  day: string;
  time: string;
} {
  if (!rule || !rule.trim()) {
    return { enabled: false, day: "3", time: "09:00" };
  }

  const dayMatch = /BYDAY=([0-6])/.exec(rule);
  const timeMatch = /BYTIME=(\d{2}:\d{2})/.exec(rule);

  return {
    enabled: true,
    day: dayMatch?.[1] ?? "3",
    time: timeMatch?.[1] ?? "09:00",
  };
}

/**
 * Monta uma regra de recorrência semanal padronizada.
 */
export function buildRecurrenceRule(day: string, time: string): string {
  const safeDay = /^[0-6]$/.test(day) ? day : "3";
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  return `FREQ=WEEKLY;BYDAY=${safeDay};BYTIME=${safeTime}`;
}

/**
 * Formata a regra de recorrência em linguagem simples para exibição ao usuário.
 */
export function formatRecurrenceSummary(
  rule: string | null | undefined,
): string | null {
  const parsed = parseRecurrenceRule(rule);
  if (!parsed.enabled) return null;
  const dayText = WEEKDAY_NAMES[parsed.day] ?? "toda semana";
  const capitalized = dayText.charAt(0).toUpperCase() + dayText.slice(1);
  return `${capitalized} às ${parsed.time}`;
}

/**
 * Nome amigável para visibilidade/escopo da tarefa.
 */
export function getScopeLabel(scope: string): string {
  switch (scope) {
    case "personal":
      return "Pessoal";
    case "department":
      return "Departamento";
    case "organization":
      return "Toda a igreja";
    default:
      return "Pessoal";
  }
}

export type AuditLookups = {
  peopleByUserId?: Record<string, string>;
  departmentsById?: Record<string, string>;
};

export function formatAuditActionInfo(action: string): {
  label: string;
  tone: "create" | "complete" | "reopen" | "update" | "delete" | "reorder";
} {
  switch (action) {
    case "created":
      return { label: "Criou a tarefa", tone: "create" };
    case "completed":
      return { label: "Concluiu a tarefa", tone: "complete" };
    case "reopened":
      return { label: "Reabriu a tarefa", tone: "reopen" };
    case "status_changed":
      return { label: "Alterou a situação", tone: "update" };
    case "reordered":
      return { label: "Reordenou tarefas", tone: "reorder" };
    case "deleted":
      return { label: "Removeu a tarefa", tone: "delete" };
    case "updated":
    default:
      return { label: "Atualizou a tarefa", tone: "update" };
  }
}

function formatHumanDate(val: unknown): string {
  if (!val) return "não definido";
  const d = new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

type RawAuditChange = {
  from?: unknown;
  to?: unknown;
  old?: unknown;
  new?: unknown;
};

/**
 * Traduz entradas do log de auditoria para português legível, sem expor UUIDs ou chaves de banco.
 */
export function formatAuditChangeLine(
  field: string,
  change: RawAuditChange,
  lookups?: AuditLookups,
): { fieldLabel: string; summary: string } | null {
  const prevVal = change.from !== undefined ? change.from : change.old;
  const nextVal = change.to !== undefined ? change.to : change.new;

  if (
    field === "completedAt" ||
    field === "completedById" ||
    field === "sortOrder" ||
    field === "parentTaskId"
  ) {
    return null;
  }

  switch (field) {
    case "title":
      return {
        fieldLabel: "Título",
        summary: `Alterado para "${String(nextVal ?? "")}"`,
      };
    case "notes":
    case "description":
      if (!nextVal) {
        return { fieldLabel: "Observações", summary: "Anotações removidas" };
      }
      return {
        fieldLabel: "Observações",
        summary: prevVal ? "Anotações editadas" : "Anotações adicionadas",
      };
    case "status": {
      const prev = prevVal ? getStatusLabel(String(prevVal)) : "—";
      const next = nextVal ? getStatusLabel(String(nextVal)) : "—";
      return { fieldLabel: "Situação", summary: `${prev} → ${next}` };
    }
    case "priority": {
      const prev = prevVal ? getPriorityLabel(String(prevVal)) : "Nenhuma";
      const next = nextVal ? getPriorityLabel(String(nextVal)) : "Nenhuma";
      return { fieldLabel: "Prioridade", summary: `${prev} → ${next}` };
    }
    case "assigneeId": {
      const map = lookups?.peopleByUserId ?? {};
      const nextName = nextVal
        ? (map[String(nextVal)] ?? "Membro da equipe")
        : null;
      return {
        fieldLabel: "Responsável",
        summary: nextName ? `Atribuída a ${nextName}` : "Responsável removido",
      };
    }
    case "departmentId": {
      const map = lookups?.departmentsById ?? {};
      const nextDept = nextVal
        ? (map[String(nextVal)] ?? "Departamento")
        : null;
      return {
        fieldLabel: "Departamento",
        summary: nextDept ?? "Removido do departamento",
      };
    }
    case "deadline":
      return {
        fieldLabel: "Prazo final",
        summary: nextVal ? formatHumanDate(nextVal) : "Prazo removido",
      };
    case "date":
      return {
        fieldLabel: "Data planejada",
        summary: nextVal ? formatHumanDate(nextVal) : "Data removida",
      };
    case "isPinned":
      return {
        fieldLabel: "Destaque",
        summary: nextVal ? "Fixada no topo" : "Desafixada",
      };
    case "tags": {
      const nextTags = Array.isArray(nextVal) ? nextVal.join(", ") : "";
      return {
        fieldLabel: "Etiquetas",
        summary: nextTags ? `Etiquetas: ${nextTags}` : "Etiquetas removidas",
      };
    }
    case "isRecurring":
      if (nextVal) {
        return { fieldLabel: "Repetição", summary: "Repetição semanal ativada" };
      }
      return { fieldLabel: "Repetição", summary: "Repetição desativada" };
    case "recurrenceRule": {
      const summary = formatRecurrenceSummary(
        nextVal ? String(nextVal) : null,
      );
      return {
        fieldLabel: "Regra de repetição",
        summary: summary ?? "Repetição desativada",
      };
    }
    case "delegationType":
      return {
        fieldLabel: "Delegação",
        summary:
          nextVal === "individual"
            ? "Individual por pessoa"
            : "Compartilhada em equipe",
      };
    case "scope":
      return {
        fieldLabel: "Visibilidade",
        summary: getScopeLabel(String(nextVal ?? "personal")),
      };
    case "url":
    case "resourceUrl":
      return {
        fieldLabel: "Link de apoio",
        summary: nextVal ? "Link atualizado" : "Link removido",
      };
    default:
      return null;
  }
}

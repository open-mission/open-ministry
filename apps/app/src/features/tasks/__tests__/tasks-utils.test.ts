import { describe, expect, it } from "bun:test";
import { addDays, subDays } from "date-fns";

import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
  getStatusLabel,
} from "../lib/task-utils";

describe("Tasks Module Utilities", () => {
  it("formats relative dates correctly for 'quando trabalhar'", () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    expect(formatTaskWhen(today)).toBe("Hoje às 09:00");

    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(14, 30, 0, 0);
    expect(formatTaskWhen(tomorrow)).toBe("Amanhã às 14:30");

    const yesterday = subDays(new Date(), 1);
    yesterday.setHours(10, 0, 0, 0);
    expect(formatTaskWhen(yesterday)).toBe("Ontem às 10:00");

    expect(formatTaskWhen(null)).toBeNull();
    expect(formatTaskWhen(undefined)).toBeNull();
  });

  it("calculates deadline label and overdue status correctly", () => {
    // Prazo no passado (ontem)
    const pastDeadline = subDays(new Date(), 2);
    const overdueResult = formatTaskDeadline(pastDeadline, false);
    expect(overdueResult).not.toBeNull();
    expect(overdueResult?.isOverdue).toBe(true);

    // Se já estiver concluída, não deve marcar como overdue
    const completedResult = formatTaskDeadline(pastDeadline, true);
    expect(completedResult?.isOverdue).toBe(false);

    // Prazo amanhã
    const futureDeadline = addDays(new Date(), 1);
    const futureResult = formatTaskDeadline(futureDeadline, false);
    expect(futureResult?.isOverdue).toBe(false);
    expect(futureResult?.label).toContain("Amanhã");
  });

  it("returns human friendly status and priority labels in pt-BR", () => {
    expect(getStatusLabel("todo")).toBe("A Fazer");
    expect(getStatusLabel("in_progress")).toBe("Em Andamento");
    expect(getStatusLabel("completed")).toBe("Concluída");
    expect(getStatusLabel("canceled")).toBe("Cancelada");

    expect(getPriorityLabel("high")).toBe("Alta");
    expect(getPriorityLabel("medium")).toBe("Média");
    expect(getPriorityLabel("low")).toBe("Baixa");
    expect(getPriorityLabel("none")).toBe("Normal");
  });
});

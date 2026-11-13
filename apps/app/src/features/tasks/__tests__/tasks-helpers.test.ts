import { describe, expect, test } from "bun:test";
import {
  buildRecurrenceRule,
  formatAuditActionInfo,
  formatAuditChangeLine,
  formatDateTimeLocalInput,
  formatRecurrenceSummary,
  getQuickDeadlineInput,
  parseRecurrenceRule,
} from "../lib/task-helpers";

describe("Tasks Module Helpers", () => {
  test("formatDateTimeLocalInput preserves local wall-clock time without UTC shift", () => {
    const localDate = new Date(2026, 10, 15, 19, 30, 0); // 15/11/2026 19:30 local
    expect(formatDateTimeLocalInput(localDate)).toBe("2026-11-15T19:30");
    expect(formatDateTimeLocalInput(null)).toBe("");
    expect(formatDateTimeLocalInput("invalid")).toBe("");
  });

  test("getQuickDeadlineInput returns valid local datetime-local values", () => {
    const morning = new Date(2026, 10, 13, 10, 0, 0); // Friday 10:00
    expect(getQuickDeadlineInput("today", morning)).toBe("2026-11-13T18:00");
    expect(getQuickDeadlineInput("tomorrow", morning)).toBe("2026-11-14T18:00");
    expect(getQuickDeadlineInput("sunday", morning)).toBe("2026-11-15T09:00");
  });

  test("recurrence rule parsing, building and formatting round-trip", () => {
    const built = buildRecurrenceRule("0", "08:30");
    expect(built).toBe("FREQ=WEEKLY;BYDAY=0;BYTIME=08:30");

    const parsed = parseRecurrenceRule(built);
    expect(parsed).toEqual({ enabled: true, day: "0", time: "08:30" });

    expect(formatRecurrenceSummary(built)).toBe("Todo domingo às 08:30");
    expect(parseRecurrenceRule(null)).toEqual({
      enabled: false,
      day: "3",
      time: "09:00",
    });
  });

  test("audit helpers translate DB keys and resolve names without leaking UUIDs", () => {
    expect(formatAuditActionInfo("created").label).toBe("Criou a tarefa");
    expect(formatAuditActionInfo("reordered").label).toBe("Reordenou tarefas");

    const statusLine = formatAuditChangeLine("status", {
      from: "todo",
      to: "in_progress",
    });
    expect(statusLine).toEqual({
      fieldLabel: "Situação",
      summary: "A Fazer → Em Andamento",
    });

    const assigneeLine = formatAuditChangeLine(
      "assigneeId",
      { from: null, to: "user-uuid-999" },
      { peopleByUserId: { "user-uuid-999": "Ana Souza" } },
    );
    expect(assigneeLine).toEqual({
      fieldLabel: "Responsável",
      summary: "Atribuída a Ana Souza",
    });

    const fallbackAssignee = formatAuditChangeLine("assigneeId", {
      from: null,
      to: "unknown-uuid",
    });
    expect(fallbackAssignee?.summary).not.toContain("unknown-uuid");
  });
});

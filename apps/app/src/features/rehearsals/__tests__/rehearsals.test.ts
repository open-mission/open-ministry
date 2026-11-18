import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

import {
  buildRehearsalRemindersToSchedule,
  computeReminderTimestamp,
  DEFAULT_REHEARSAL_ALERTS,
  REHEARSAL_REMINDER_GRACE_MS,
} from "@/features/rehearsals/lib/rehearsal-alerts";

describe("Rehearsal alert engine", () => {
  it("computes offset reminders in UTC", () => {
    const startsAt = new Date("2026-11-20T23:00:00.000Z");

    expect(
      computeReminderTimestamp(startsAt, {
        triggerType: "offset_minutes",
        offsetMinutes: 2880,
      }).toISOString(),
    ).toBe("2026-11-18T23:00:00.000Z");

    expect(
      computeReminderTimestamp(startsAt, {
        triggerType: "offset_minutes",
        offsetMinutes: 0,
      }).toISOString(),
    ).toBe("2026-11-20T23:00:00.000Z");
  });

  it("computes day_of_at_time in America/Sao_Paulo", () => {
    // 2026-11-21T00:30:00Z = 20/11/2026 21:30 em São Paulo (UTC-3)
    const startsAt = new Date("2026-11-21T00:30:00.000Z");

    expect(
      computeReminderTimestamp(startsAt, {
        triggerType: "day_of_at_time",
        timeOfDay: "08:00",
      }).toISOString(),
    ).toBe("2026-11-20T11:00:00.000Z");

    expect(
      computeReminderTimestamp(startsAt, {
        triggerType: "day_of_at_time",
        timeOfDay: "19:30",
      }).toISOString(),
    ).toBe("2026-11-20T22:30:00.000Z");

    // No dia seguinte em UTC ainda é o mesmo dia civil em São Paulo.
    const lateNight = new Date("2026-11-20T02:00:00.000Z");
    expect(
      computeReminderTimestamp(lateNight, {
        triggerType: "day_of_at_time",
        timeOfDay: "08:00",
      }).toISOString(),
    ).toBe("2026-11-19T11:00:00.000Z");
  });

  it("ships the three default alert rules", () => {
    expect(DEFAULT_REHEARSAL_ALERTS).toHaveLength(3);
    expect(DEFAULT_REHEARSAL_ALERTS.map((rule) => rule.label)).toEqual([
      "2 dias antes",
      "No dia do ensaio (08:00)",
      "No horário do ensaio",
    ]);
    expect(
      DEFAULT_REHEARSAL_ALERTS.every(
        (rule) =>
          rule.enabled === true &&
          rule.isDefault === true &&
          rule.channels.includes("in_app") &&
          rule.channels.includes("push"),
      ),
    ).toBe(true);
    expect(DEFAULT_REHEARSAL_ALERTS[0]?.offsetMinutes).toBe(2880);
    expect(DEFAULT_REHEARSAL_ALERTS[1]?.timeOfDay).toBe("08:00");
    expect(DEFAULT_REHEARSAL_ALERTS[2]?.offsetMinutes).toBe(0);
  });

  it("builds deterministic future reminders and respects the grace window", () => {
    const startsAt = new Date("2026-11-20T23:00:00.000Z");
    const input = {
      id: "event-1",
      organizationId: "org-1",
      departmentId: "dept-1",
      startsAt,
    };
    const now = new Date("2026-11-10T12:00:00.000Z");

    const reminders = buildRehearsalRemindersToSchedule(
      input,
      DEFAULT_REHEARSAL_ALERTS,
      now,
    );

    expect(reminders).toHaveLength(3);
    expect(reminders.map((reminder) => reminder.label)).toEqual([
      "2 dias antes",
      "No dia do ensaio (08:00)",
      "No horário do ensaio",
    ]);
    expect(reminders.every((reminder) => reminder.scheduledFor > now)).toBe(
      true,
    );
    expect(new Set(reminders.map((r) => r.dedupeKey)).size).toBe(3);
    expect(reminders[0]?.dedupeKey).toContain("event-1");
    expect(reminders[0]?.dedupeKey).toContain("offset:2880");

    // Determinístico: mesma entrada, mesma saída.
    const again = buildRehearsalRemindersToSchedule(
      input,
      DEFAULT_REHEARSAL_ALERTS,
      now,
    );
    expect(again.map((r) => r.dedupeKey)).toEqual(
      reminders.map((r) => r.dedupeKey),
    );

    // 1 minuto depois do início ainda entra (janela de 2 min).
    const afterGraceStart = buildRehearsalRemindersToSchedule(
      input,
      DEFAULT_REHEARSAL_ALERTS,
      new Date(startsAt.getTime() + 60_000),
    );
    expect(
      afterGraceStart.some((r) => r.label === "No horário do ensaio"),
    ).toBe(true);

    // 3 minutos depois já ficou para trás.
    const afterGraceEnd = buildRehearsalRemindersToSchedule(
      input,
      DEFAULT_REHEARSAL_ALERTS,
      new Date(startsAt.getTime() + REHEARSAL_REMINDER_GRACE_MS + 60_000),
    );
    expect(
      afterGraceEnd.some((r) => r.label === "No horário do ensaio"),
    ).toBe(false);
  });

  it("ignores disabled rules", () => {
    const reminders = buildRehearsalRemindersToSchedule(
      {
        id: "event-2",
        organizationId: "org-1",
        departmentId: "dept-1",
        startsAt: new Date("2026-11-20T23:00:00.000Z"),
      },
      DEFAULT_REHEARSAL_ALERTS.map((rule, index) => ({
        ...rule,
        enabled: index !== 0,
      })),
      new Date("2026-11-10T12:00:00.000Z"),
    );

    expect(reminders).toHaveLength(2);
    expect(reminders.some((r) => r.label === "2 dias antes")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*                    POST /api/jobs/rehearsal-reminders                      */
/* -------------------------------------------------------------------------- */

let mockAuthResult: { ok: true } | { ok: false; reason: string } = {
  ok: true,
};

const dispatchCalls: string[] = [];
let sweepCalls = 0;

mock.module("@/lib/queue", () => ({
  verifyQueueEndpointAuth: async () => mockAuthResult,
  scheduleRehearsalReminderJob: async () => null,
  cancelScheduledQStashMessage: async () => false,
}));

mock.module("@/features/rehearsals/services/rehearsals-service", () => ({
  dispatchRehearsalReminder: async (reminderId: string) => {
    dispatchCalls.push(reminderId);
    return {
      ok: true,
      reminderId,
      status: "sent",
      sent: 1,
      failed: 0,
    };
  },
  sweepDueRehearsalReminders: async () => {
    sweepCalls += 1;
    return { processed: 0, sent: 0, failed: 0 };
  },
}));

const { GET, POST } = await import("@/app/api/jobs/rehearsal-reminders/route");

function postRequest(body: unknown) {
  return new Request("https://app.test/api/jobs/rehearsal-reminders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/jobs/rehearsal-reminders", () => {
  it("GET is not allowed", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it("rejects requests without a valid queue signature", async () => {
    mockAuthResult = { ok: false, reason: "missing_signature" };
    const response = await POST(postRequest({ reminderId: "rem-1" }));
    expect(response.status).toBe(401);
    expect(dispatchCalls).toHaveLength(0);
  });

  it("dispatches a single reminder when signed", async () => {
    mockAuthResult = { ok: true };
    const response = await POST(postRequest({ reminderId: "rem-1" }));
    const data = (await response.json()) as { success: boolean; mode: string };

    expect(response.status).toBe(200);
    expect(data.mode).toBe("single");
    expect(data.success).toBe(true);
    expect(dispatchCalls).toEqual(["rem-1"]);
  });

  it("falls back to the due-reminder sweep when no reminderId is sent", async () => {
    mockAuthResult = { ok: true };
    const before = sweepCalls;
    const response = await POST(postRequest({}));
    const data = (await response.json()) as { success: boolean; mode: string };

    expect(response.status).toBe(200);
    expect(data.mode).toBe("sweep");
    expect(sweepCalls).toBe(before + 1);
  });
});

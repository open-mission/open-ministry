import { describe, expect, it } from "bun:test";

import type { Client as QStashClient } from "@upstash/qstash";

import {
  scheduleRehearsalReminderJob,
  toQStashDeduplicationId,
} from "@/lib/queue";

// Chave real do lembrete de ensaio: contém ":", "-" e "." — justamente os
// caracteres que o header Upstash-Deduplication-Id não aceita.
const DEDUPE_KEY = "rehearsal:evt-1:rule-1:2026-11-18T22:10:00.000Z";

describe("toQStashDeduplicationId", () => {
  it("gera um hash SHA-256 hexadecimal de 64 caracteres, sem ':'", () => {
    const id = toQStashDeduplicationId(DEDUPE_KEY);

    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain(":");
    expect(id).not.toContain("-");
    expect(id).not.toContain(".");
  });

  it("é determinístico para a mesma chave", () => {
    expect(toQStashDeduplicationId(DEDUPE_KEY)).toBe(
      toQStashDeduplicationId(DEDUPE_KEY),
    );
  });

  it("gera ids distintos para chaves diferentes", () => {
    const otherRule = toQStashDeduplicationId(
      "rehearsal:evt-1:rule-2:2026-11-18T22:10:00.000Z",
    );
    const otherTimestamp = toQStashDeduplicationId(
      "rehearsal:evt-1:rule-1:2026-11-19T22:10:00.000Z",
    );

    expect(otherRule).not.toBe(toQStashDeduplicationId(DEDUPE_KEY));
    expect(otherTimestamp).not.toBe(toQStashDeduplicationId(DEDUPE_KEY));
    expect(otherRule).not.toBe(otherTimestamp);
  });
});

describe("scheduleRehearsalReminderJob", () => {
  it("envia deduplicationId em hash e notBefore em segundos inteiros", async () => {
    const published: Array<Record<string, unknown>> = [];
    const publishJSON = async (request: Record<string, unknown>) => {
      published.push(request);
      return { messageId: "msg_123" };
    };

    // Mantém o agendamento dentro do limite de 7 dias do QStash.
    const deliverAt = new Date(Date.now() + 10 * 60 * 1000);

    const result = await scheduleRehearsalReminderJob(
      {
        reminderId: "rem_1",
        organizationId: "org_1",
        deliverAt,
        dedupeKey: DEDUPE_KEY,
      },
      {
        qstash: {
          publishJSON,
        } as unknown as Pick<QStashClient, "publishJSON">,
        appBaseUrl: "https://app.example.com/",
      },
    );

    expect(result).toBe("msg_123");
    expect(published).toHaveLength(1);

    const request = published[0];
    if (!request) {
      throw new Error("publishJSON não foi chamado");
    }

    const expectedDeduplicationId = toQStashDeduplicationId(DEDUPE_KEY);
    const deduplicationId = String(request.deduplicationId);
    const notBefore = Number(request.notBefore);

    expect(deduplicationId).toBe(expectedDeduplicationId);
    expect(deduplicationId).toMatch(/^[a-f0-9]{64}$/);
    expect(deduplicationId).not.toContain(":");

    expect(notBefore).toBe(Math.floor(deliverAt.getTime() / 1000));
    expect(Number.isInteger(notBefore)).toBe(true);

    expect(request.url).toBe(
      "https://app.example.com/api/jobs/rehearsal-reminders",
    );
    expect(request.body).toEqual({
      reminderId: "rem_1",
      organizationId: "org_1",
    });
    expect(request.retries).toBe(3);
  });

  it("retorna null sem publicar quando o QStash não está disponível", async () => {
    const result = await scheduleRehearsalReminderJob(
      {
        reminderId: "rem_1",
        organizationId: "org_1",
        deliverAt: new Date(Date.now() + 10 * 60 * 1000),
        dedupeKey: DEDUPE_KEY,
      },
      { qstash: null, appBaseUrl: "https://app.example.com" },
    );

    expect(result).toBeNull();
  });
});

import { describe, expect, it, vi } from "bun:test";
import * as Sentry from "@sentry/nextjs";

import {
  isNoisySentryMessage,
  isSensitiveOrPiiKey,
  sanitizeLogAttributes,
  sanitizeSentryEvent,
  sanitizeSentryLog,
  sanitizeTelemetryText,
  type SentryEventLike,
} from "../sanitize";
import {
  logWideEvent,
  sentryLogger,
  setSentryUser,
  telemetryLogger,
} from "../sentry";

describe("Sentry Structured Logging Engine", () => {
  it("sanitizes attributes to ensure only string | number | boolean primitives", () => {
    const raw = {
      user: "Claudio",
      count: 42,
      active: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      metadata: { role: "admin", departmentId: "dept_123" },
      items: ["item1", "item2"],
      skippedNull: null,
      skippedUndefined: undefined,
    };

    const sanitized = sanitizeLogAttributes(raw);

    expect(sanitized.user).toBe("Claudio");
    expect(sanitized.count).toBe(42);
    expect(sanitized.active).toBe(true);
    expect(sanitized.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(sanitized.metadata).toBe('{"role":"admin","departmentId":"dept_123"}');
    expect(sanitized.items).toBe('["item1","item2"]');
    expect("skippedNull" in sanitized).toBe(false);
    expect("skippedUndefined" in sanitized).toBe(false);
  });

  it("automatically redacts sensitive keys such as passwords, tokens and secrets", () => {
    const raw = {
      userPassword: "super-secret-password",
      apiToken: "sk_live_12345",
      secretWebhookKey: "whsec_abc",
      creditCardNumber: "4111111111111111",
      sessionCookie: "sess_xyz",
    };

    const sanitized = sanitizeLogAttributes(raw);

    expect(sanitized.userPassword).toBe("[REDACTED]");
    expect(sanitized.apiToken).toBe("[REDACTED]");
    expect(sanitized.secretWebhookKey).toBe("[REDACTED]");
    expect(sanitized.creditCardNumber).toBe("[REDACTED]");
    expect(sanitized.sessionCookie).toBe("[REDACTED]");
  });

  it("redacts PII keys but preserves opaque identifiers", () => {
    const sanitized = sanitizeLogAttributes({
      email: "membro@igreja.com",
      targetEmail: "convidado@igreja.com",
      phone: "+55 11 99999-0000",
      cpf: "123.456.789-00",
      username: "pastor",
      fullName: "Pastor João",
      notes: "Observação sensível",
      userId: "usr_100",
      organizationId: "org_200",
      taskId: "task_300",
      action: "createTask",
      role: "admin",
      eventName: "task.created",
      errorName: "TypeError",
      instanceName: "worker-1",
    });

    expect(sanitized.email).toBe("[REDACTED]");
    expect(sanitized.targetEmail).toBe("[REDACTED]");
    expect(sanitized.phone).toBe("[REDACTED]");
    expect(sanitized.cpf).toBe("[REDACTED]");
    expect(sanitized.username).toBe("[REDACTED]");
    expect(sanitized.fullName).toBe("[REDACTED]");
    expect(sanitized.notes).toBe("[REDACTED]");

    expect(sanitized.userId).toBe("usr_100");
    expect(sanitized.organizationId).toBe("org_200");
    expect(sanitized.taskId).toBe("task_300");
    expect(sanitized.action).toBe("createTask");
    expect(sanitized.role).toBe("admin");
    expect(sanitized.eventName).toBe("task.created");
    expect(sanitized.errorName).toBe("TypeError");
    expect(sanitized.instanceName).toBe("worker-1");
  });

  it("classifies sensitive and PII keys without masking opaque names", () => {
    expect(isSensitiveOrPiiKey("authorization")).toBe(true);
    expect(isSensitiveOrPiiKey("userPassword")).toBe(true);
    expect(isSensitiveOrPiiKey("inviter_email")).toBe(true);
    expect(isSensitiveOrPiiKey("whatsapp")).toBe(true);

    expect(isSensitiveOrPiiKey("eventName")).toBe(false);
    expect(isSensitiveOrPiiKey("instanceName")).toBe(false);
    expect(isSensitiveOrPiiKey("userId")).toBe(false);
    expect(isSensitiveOrPiiKey("role")).toBe(false);
  });

  it("handles Error objects gracefully without throwing or dropping message", () => {
    const err = new Error("Database timeout connection");
    const sanitized = sanitizeLogAttributes({
      operation: "findPerson",
      failure: err,
    });

    expect(sanitized.operation).toBe("findPerson");
    expect(sanitized.failure).toBe("Error: Database timeout connection");
  });

  it("redacts SQL params, e-mails and Bearer tokens from free text", () => {
    const text =
      "query failed params: [\"maria@igreja.com\", \"123\"]\nAuthorization: Bearer eyJhbGciOi.abc-123";

    const sanitized = sanitizeTelemetryText(text);

    expect(sanitized).toContain("params: [REDACTED]");
    expect(sanitized).not.toContain("maria@igreja.com");
    expect(sanitized).toContain("Bearer [REDACTED]");
    expect(sanitized).not.toContain("eyJhbGciOi.abc-123");
  });

  it("masks e-mails in string attributes", () => {
    const sanitized = sanitizeLogAttributes({
      description: "Falha ao notificar maria@igreja.com",
    });

    expect(sanitized.description).toBe("Falha ao notificar [REDACTED_EMAIL]");
  });

  it("discards noisy Sentry messages", () => {
    expect(isNoisySentryMessage("NEXT_REDIRECT")).toBe(true);
    expect(isNoisySentryMessage("Compiled in 120ms")).toBe(true);
    expect(
      isNoisySentryMessage("MaxListenersExceededWarning: Possible EventEmitter"),
    ).toBe(true);
    expect(isNoisySentryMessage("Tarefa criada com sucesso")).toBe(false);
  });

  it("drops noisy events and strips PII from the remaining event", () => {
    expect(
      sanitizeSentryEvent({
        message: "NEXT_NOT_FOUND",
      }),
    ).toBeNull();

    const event = sanitizeSentryEvent<SentryEventLike>({
      message: "Falha ao enviar para maria@igreja.com",
      logentry: {
        formatted: "Login de maria@igreja.com",
        message: "params: [\"maria@igreja.com\"]",
      },
      exception: {
        values: [{ value: "Bearer abc.def-123 expirou" }],
      },
      breadcrumbs: [{ message: "Email maria@igreja.com enviado" }],
      user: {
        id: "usr_100",
        email: "maria@igreja.com",
        username: "maria",
        name: "Maria",
        ip_address: "203.0.113.10",
      },
    });

    expect(event).not.toBeNull();
    expect(event?.message).toBe("Falha ao enviar para [REDACTED_EMAIL]");
    expect(event?.logentry?.formatted).toBe("Login de [REDACTED_EMAIL]");
    expect(event?.logentry?.message).toBe("params: [REDACTED]");
    expect(event?.exception?.values?.[0]?.value).toBe("Bearer [REDACTED] expirou");
    expect(event?.breadcrumbs?.[0]?.message).toBe("Email [REDACTED_EMAIL] enviado");
    expect(event?.user).toEqual({ id: "usr_100" });
  });

  it("drops noisy exception events", () => {
    expect(
      sanitizeSentryEvent({
        exception: { values: [{ value: "NEXT_REDIRECT" }] },
      }),
    ).toBeNull();
  });

  it("sanitizes and filters structured logs", () => {
    expect(
      sanitizeSentryLog({ level: "debug", message: "Cache hit" }, "production"),
    ).toBeNull();
    expect(sanitizeSentryLog({ level: "debug", message: "Cache hit" }, "development"))
      .not.toBeNull();

    expect(
      sanitizeSentryLog(
        { level: "info", message: "Compiled in 42ms" },
        "production",
      ),
    ).toBeNull();

    const log = sanitizeSentryLog(
      {
        level: "error",
        message: "Falha para maria@igreja.com",
        attributes: {
          email: "maria@igreja.com",
          note: "token Bearer abc.def-123",
          taskId: "task_1",
        },
      },
      "production",
    );

    expect(log?.message).toBe("Falha para [REDACTED_EMAIL]");
    expect(log?.attributes?.email).toBe("[REDACTED]");
    expect(log?.attributes?.note).toBe("token Bearer [REDACTED]");
    expect(log?.attributes?.taskId).toBe("task_1");
  });

  it("sends only opaque user identifiers to Sentry", () => {
    const setUserSpy = vi
      .spyOn(Sentry, "setUser")
      .mockImplementation(() => {});

    setSentryUser({
      id: "usr_100",
      email: "maria@igreja.com",
      name: "Maria",
      churchId: "org_200",
    });

    expect(setUserSpy).toHaveBeenCalledWith({
      id: "usr_100",
      churchId: "org_200",
    });
    const payload = setUserSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.email).toBeUndefined();
    expect(payload.username).toBeUndefined();
    expect(payload.name).toBeUndefined();

    setSentryUser(null);
    expect(setUserSpy).toHaveBeenLastCalledWith(null);

    setUserSpy.mockRestore();
  });

  it("emits wide events with comprehensive unified telemetry", () => {
    const infoSpy = vi.spyOn(Sentry.logger, "info").mockImplementation(() => {});

    logWideEvent("member.onboarding_completed", {
      userId: "usr_100",
      churchId: "church_200",
      durationMs: 450,
      departmentsAssigned: 2,
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [msg, attrs] = infoSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(msg).toBe("[Event: member.onboarding_completed]");
    expect(attrs.event).toBe("member.onboarding_completed");
    expect(attrs.userId).toBe("usr_100");
    expect(attrs.churchId).toBe("church_200");
    expect(attrs.durationMs).toBe(450);
    expect(attrs.departmentsAssigned).toBe(2);
    expect(typeof attrs.timestamp).toBe("string");

    infoSpy.mockRestore();
  });

  it("forwards telemetryLogger levels to Sentry Structured Logs", () => {
    const infoSpy = vi.spyOn(Sentry.logger, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(Sentry.logger, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(Sentry.logger, "error").mockImplementation(() => {});

    telemetryLogger.info("Culto agendado", { eventId: "evt_123" });
    expect(infoSpy).toHaveBeenCalledWith("Culto agendado", expect.objectContaining({ eventId: "evt_123" }));

    telemetryLogger.warn("WhatsApp rate limit near", { remaining: 5 });
    expect(warnSpy).toHaveBeenCalledWith("WhatsApp rate limit near", expect.objectContaining({ remaining: 5 }));

    telemetryLogger.error("Failed to sync volunteer", { volunteerId: "vol_1" });
    expect(errorSpy).toHaveBeenCalledWith("Failed to sync volunteer", expect.objectContaining({ volunteerId: "vol_1" }));

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("sanitizes error messages and stacks before logging", () => {
    const errorSpy = vi.spyOn(Sentry.logger, "error").mockImplementation(() => {});
    const err = new Error("insert failed params: [\"maria@igreja.com\"]");
    err.stack = `Error: maria@igreja.com\n  at foo (Bearer abc.def-123)`;

    sentryLogger.error(err);

    const [message, attrs] = errorSpy.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(message).toBe("Error: insert failed params: [REDACTED]");
    expect(attrs.errorName).toBe("Error");
    expect(String(attrs.errorStack)).toContain("[REDACTED_EMAIL]");
    expect(String(attrs.errorStack)).toContain("Bearer [REDACTED]");

    errorSpy.mockRestore();
  });

  it("exposes Sentry.logger.fmt tagged template literal on logger facades", () => {
    expect(typeof sentryLogger.fmt).toBe("function");
    expect(typeof telemetryLogger.fmt).toBe("function");
    expect(sentryLogger.fmt).toBe(Sentry.logger.fmt);
  });
});

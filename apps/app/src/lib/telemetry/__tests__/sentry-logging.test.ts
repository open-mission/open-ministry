import { describe, expect, it, vi } from "bun:test";
import * as Sentry from "@sentry/nextjs";

import {
  logWideEvent,
  sanitizeLogAttributes,
  sentryLogger,
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
      username: "pastor",
      userPassword: "super-secret-password",
      apiToken: "sk_live_12345",
      secretWebhookKey: "whsec_abc",
      creditCardNumber: "4111111111111111",
      sessionCookie: "sess_xyz",
    };

    const sanitized = sanitizeLogAttributes(raw);

    expect(sanitized.username).toBe("pastor");
    expect(sanitized.userPassword).toBe("[REDACTED]");
    expect(sanitized.apiToken).toBe("[REDACTED]");
    expect(sanitized.secretWebhookKey).toBe("[REDACTED]");
    expect(sanitized.creditCardNumber).toBe("[REDACTED]");
    expect(sanitized.sessionCookie).toBe("[REDACTED]");
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

  it("exposes Sentry.logger.fmt tagged template literal on logger facades", () => {
    expect(typeof sentryLogger.fmt).toBe("function");
    expect(typeof telemetryLogger.fmt).toBe("function");
    expect(sentryLogger.fmt).toBe(Sentry.logger.fmt);
  });
});

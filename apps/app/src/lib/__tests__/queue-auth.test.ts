import { afterEach, describe, expect, it } from "bun:test";

import { verifyQueueEndpointAuth } from "@/lib/queue";

function request(headers: Record<string, string>): Request {
  return new Request("https://app.test/api/webhooks/qstash/notification", {
    method: "POST",
    headers,
  });
}

function fakeReceiver(valid: boolean) {
  return { verify: async () => valid };
}

const savedCronSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (savedCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = savedCronSecret;
  }
});

describe("verifyQueueEndpointAuth", () => {
  it("allows a valid QStash signature in production", async () => {
    const result = await verifyQueueEndpointAuth(
      request({ "upstash-signature": "valid-sig" }),
      "{}",
      "production",
      fakeReceiver(true),
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects an invalid QStash signature even in development", async () => {
    const result = await verifyQueueEndpointAuth(
      request({ "upstash-signature": "forged-sig" }),
      "{}",
      "development",
      fakeReceiver(false),
    );

    expect(result).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("rejects a missing signature when the receiver is configured, in production", async () => {
    const result = await verifyQueueEndpointAuth(
      request({}),
      "{}",
      "production",
      fakeReceiver(true),
    );

    expect(result).toEqual({ ok: false, reason: "missing_signature" });
  });

  it("rejects a missing signature when the receiver is configured, in development", async () => {
    const result = await verifyQueueEndpointAuth(
      request({}),
      "{}",
      "development",
      fakeReceiver(true),
    );

    expect(result).toEqual({ ok: false, reason: "missing_signature" });
  });

  it("allows unsigned requests outside production when QStash is not configured", async () => {
    const result = await verifyQueueEndpointAuth(
      request({}),
      "{}",
      "development",
      null,
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects unsigned requests in production when QStash is not configured", async () => {
    const result = await verifyQueueEndpointAuth(
      request({}),
      "{}",
      "production",
      null,
    );

    expect(result).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("allows a valid CRON_SECRET bearer token even without QStash, in production", async () => {
    process.env.CRON_SECRET = "cron-secret-123";

    const result = await verifyQueueEndpointAuth(
      request({ authorization: "Bearer cron-secret-123" }),
      "{}",
      "production",
      null,
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects a wrong CRON_SECRET bearer token in production without QStash", async () => {
    process.env.CRON_SECRET = "cron-secret-123";

    const result = await verifyQueueEndpointAuth(
      request({ authorization: "Bearer wrong-secret" }),
      "{}",
      "production",
      null,
    );

    expect(result).toEqual({ ok: false, reason: "unconfigured" });
  });
});

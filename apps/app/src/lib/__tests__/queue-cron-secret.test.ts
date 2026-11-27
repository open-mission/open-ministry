import { afterEach, describe, expect, it } from "bun:test";

const { verifyQueueEndpointAuth } = await import("@/lib/queue");

const originalSecret = process.env.CRON_SECRET;

function requestWithAuthorization(value: string | null): Request {
  const headers = new Headers();
  if (value) headers.set("authorization", value);
  return new Request("https://app.test/api/workflows/jobs", {
    method: "POST",
    headers,
    body: "{}",
  });
}

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("verifyQueueEndpointAuth — CRON_SECRET", () => {
  it("aceita bearer correto em produção", async () => {
    process.env.CRON_SECRET = "segredo-super-secreto";

    const result = await verifyQueueEndpointAuth(
      requestWithAuthorization("Bearer segredo-super-secreto"),
      "{}",
      "production",
      null,
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejeita bearer parecido mas diferente em produção", async () => {
    process.env.CRON_SECRET = "segredo-super-secreto";

    const result = await verifyQueueEndpointAuth(
      requestWithAuthorization("Bearer segredo-super-secretx"),
      "{}",
      "production",
      null,
    );

    expect(result.ok).toBe(false);
  });

  it("rejeita token vazio e ausência de header", async () => {
    process.env.CRON_SECRET = "segredo-super-secreto";

    expect(
      (
        await verifyQueueEndpointAuth(
          requestWithAuthorization("Bearer "),
          "{}",
          "production",
          null,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await verifyQueueEndpointAuth(
          requestWithAuthorization(null),
          "{}",
          "production",
          null,
        )
      ).ok,
    ).toBe(false);
  });
});

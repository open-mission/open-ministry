import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, retryAfter: null }),
  extractClientIp: () => "unknown",
  rateLimitHeaders: () => ({}),
  RATE_LIMIT_RULES: {},
}));

type UpdateCall = { values: Record<string, unknown>; where: unknown };
let updates: UpdateCall[] = [];

mock.module("@/db", () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: unknown) => {
          updates.push({ values, where });
          return Promise.resolve({ rowCount: 1 });
        },
      }),
    }),
    query: {
      whatsappMessageLog: { findFirst: async () => null },
    },
  },
  schema: {
    organizationNotificationChannel: {
      organizationId: "organization_id",
      channel: "channel",
      instanceName: "instance_name",
      webhookSecret: "webhook_secret",
    },
    whatsappMessageLog: {
      evolutionMessageId: "evolution_message_id",
      organizationId: "organization_id",
      status: "status",
      createdAt: "created_at",
      recipientPhone: "recipient_phone",
      id: "id",
    },
  },
}));

let mockedAuth:
  | {
      ok: true;
      organizationId: string | null;
      channelId: string | null;
      instanceName: string | null;
    }
  | { ok: false } = {
  ok: true,
  organizationId: "org-1",
  channelId: null,
  instanceName: null,
};
let receivedToken: string | null | undefined;

mock.module("@/lib/evolution-webhook", () => ({
  authenticateEvolutionWebhook: async (token: string | null | undefined) => {
    receivedToken = token;
    return mockedAuth;
  },
}));

mock.module("@/lib/telemetry/sentry", () => ({
  sentryLogger: {
    setScopeContext: () => {},
    info: () => {},
    error: () => {},
    fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce((acc, part, index) => acc + part + (values[index] ?? ""), ""),
  },
}));

const { POST } = await import("@/app/api/webhooks/evolution/route");

function request(body: unknown) {
  return new Request("https://app.test/api/webhooks/evolution?token=valid", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("webhook connection.update", () => {
  it("atualiza status, telefone e nome conectados", async () => {
    updates = [];
    const response = await POST(
      request({
        event: "connection.update",
        instance: "igreja-1",
        data: {
          state: "open",
          jid: "5511999999999@s.whatsapp.net",
          profileName: "Igreja PCM",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(updates.length).toBeGreaterThan(0);
    const values = updates[0].values;
    expect(values.connectionStatus).toBe("connected");
    expect(values.connectedPhone).toBe("5511999999999");
    expect(values.connectedProfileName).toBe("Igreja PCM");
    expect(values.lastConnectedAt).toBeInstanceOf(Date);
    expect(values.lastError).toBeNull();
  });

  it("registra erro legível quando desconectado", async () => {
    updates = [];
    await POST(
      request({
        event: "connection_update",
        instance: "igreja-1",
        data: { state: "close", error: "device disconnected" },
      }),
    );
    expect(updates[0].values.connectionStatus).toBe("close");
    expect(updates[0].values.lastError).toBe("device disconnected");
    expect(updates[0].values.connectedPhone).toBeNull();
  });

  it("rejeita connection.update sem instanceName", async () => {
    updates = [];
    const response = await POST(
      request({
        event: "connection.update",
        data: { state: "open" },
      }),
    );
    expect(response.status).toBe(400);
    expect(updates.length).toBe(0);
  });

  it("rejeita instanceName diferente do canal autenticado", async () => {
    updates = [];
    mockedAuth = {
      ok: true,
      organizationId: "org-1",
      channelId: "channel-1",
      instanceName: "igreja-1",
    };
    const response = await POST(
      request({
        event: "connection.update",
        instance: "outra-igreja",
        data: { state: "open" },
      }),
    );
    expect(response.status).toBe(400);
    expect(updates.length).toBe(0);
    mockedAuth = {
      ok: true,
      organizationId: "org-1",
      channelId: null,
      instanceName: null,
    };
  });

  it("aceita o segredo via header x-webhook-token e via authorization Bearer", async () => {
    updates = [];
    const baseBody = {
      event: "connection.update",
      instance: "igreja-1",
      data: { state: "open" },
    };

    const withHeader = new Request(
      "https://app.test/api/webhooks/evolution",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-token": "secret-do-header",
        },
        body: JSON.stringify(baseBody),
      },
    );
    await POST(withHeader);
    expect(receivedToken).toBe("secret-do-header");

    const withBearer = new Request(
      "https://app.test/api/webhooks/evolution",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer secret-do-bearer",
        },
        body: JSON.stringify(baseBody),
      },
    );
    await POST(withBearer);
    expect(receivedToken).toBe("secret-do-bearer");
  });
});

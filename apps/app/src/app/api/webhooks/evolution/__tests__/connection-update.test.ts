import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

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

mock.module("@/lib/evolution-webhook", () => ({
  authenticateEvolutionWebhook: async () => ({
    ok: true,
    organizationId: "org-1",
  }),
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
});

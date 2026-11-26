import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let decision: { allowed: boolean; retryAfter: number | null } = {
  allowed: true,
  retryAfter: null,
};
let recipientCount = 3;
let rejectDispatch = false;

const dispatchCalls: Array<Record<string, unknown>> = [];
let active = 0;
let maxActive = 0;

mock.module("@/lib/rate-limit", () => ({
  checkRateLimit: async () => decision,
  extractClientIp: () => "unknown",
  rateLimitHeaders: () => ({}),
  RATE_LIMIT_RULES: {},
}));

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => ({
    organization: { id: "org-1", name: "Igreja" },
    session: { user: { id: "user-1", name: "Líder" } },
    isAdmin: true,
  }),
}));

mock.module("@/lib/permissions/service", () => ({ can: async () => true }));

mock.module("@/lib/notification-service", () => ({
  dispatchNotification: async (options: Record<string, unknown>) => {
    active++;
    maxActive = Math.max(maxActive, active);
    dispatchCalls.push(options);
    await Promise.resolve();
    active--;
    if (rejectDispatch && dispatchCalls.length === 1) {
      throw new Error("falha pontual");
    }
  },
  getOrganizationEvolutionConfig: async () => ({ config: { id: "cfg-1" } }),
  retryFailedWhatsAppMessages: async () => ({ sent: 0 }),
  retryWhatsAppMessage: async () => ({ ok: true }),
}));

mock.module("@/lib/notifications", () => ({
  createNotifications: async () => {},
  listNotifications: async () => [],
  markNotificationRead: async () => true,
  markAllNotificationsRead: async () => true,
}));

mock.module("@/lib/push-notifications", () => ({
  sendWebPushToUser: async () => ({ sentCount: 1, errors: 0 }),
}));

mock.module("@/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: (_target, table: string) => ({
          findFirst: async () =>
            table === "person"
              ? {
                  id: "p-1",
                  userId: "u-1",
                  phone: "5511999999999",
                  email: "p@example.com",
                  name: "Pessoa",
                }
              : null,
          findMany: async () =>
            Array.from({ length: recipientCount }, (_, index) => ({
              id: `p-${index}`,
              userId: `u-${index}`,
              phone: "5511999999999",
              email: `p${index}@example.com`,
              name: `Pessoa ${index}`,
            })),
        }),
      },
    ),
  },
}));

const { sendAnnouncementAction } = await import("@/app/actions/notifications");

function form(channels: string[]): FormData {
  const data = new FormData();
  data.set("title", "Aviso importante");
  data.set("body", "Mensagem de teste");
  data.set("audienceType", "all");
  for (const channel of channels) data.append("channels", channel);
  return data;
}

beforeEach(() => {
  decision = { allowed: true, retryAfter: null };
  recipientCount = 3;
  rejectDispatch = false;
  dispatchCalls.length = 0;
  active = 0;
  maxActive = 0;
});

describe("sendAnnouncementAction — rate limit", () => {
  it("bloqueia antes de resolver destinatários quando excedeu o limite", async () => {
    decision = { allowed: false, retryAfter: 120 };
    const result = await sendAnnouncementAction(undefined, form(["whatsapp"]));

    expect(result?.error).toContain("120");
    expect(dispatchCalls).toHaveLength(0);
  });
});

describe("sendAnnouncementAction — lotes controlados", () => {
  it("envia WhatsApp e e-mail com no máximo 10 dispatches simultâneos", async () => {
    recipientCount = 25;
    const result = await sendAnnouncementAction(
      undefined,
      form(["whatsapp", "email"]),
    );

    expect(result).toEqual({ success: true });
    expect(dispatchCalls).toHaveLength(50);
    expect(maxActive).toBeLessThanOrEqual(10);
    expect(maxActive).toBeGreaterThan(1);
  });

  it("uma falha isolada não aborta os demais dispatches", async () => {
    rejectDispatch = true;
    const result = await sendAnnouncementAction(
      undefined,
      form(["whatsapp"]),
    );

    expect(result).toEqual({ success: true });
    expect(dispatchCalls).toHaveLength(3);
  });
});

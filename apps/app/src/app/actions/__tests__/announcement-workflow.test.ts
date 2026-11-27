import { afterEach, describe, expect, it, mock } from "bun:test";

const dispatchCalls: unknown[] = [];
const createdJobs: Record<string, unknown>[] = [];
const triggeredWorkflows: Record<string, unknown>[] = [];
const afterCalls: unknown[] = [];

function installMocks() {
  mock.module("server-only", () => ({}));
  mock.module("next/server", () => ({
    after: (task: () => Promise<void>) => {
      afterCalls.push(task);
    },
  }));
  mock.module("@/lib/rate-limit", () => ({
    checkRateLimit: async () => ({ allowed: true, retryAfter: null }),
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
    dispatchNotification: async (options: unknown) => {
      dispatchCalls.push(options);
    },
    getOrganizationEvolutionConfig: async () => ({ config: { id: "cfg-1" } }),
  }));
  mock.module("@/lib/notifications", () => ({
    createNotifications: async () => {},
  }));
  mock.module("@/lib/push-notifications", () => ({
    sendWebPushToUser: async () => ({ sentCount: 1, errors: 0 }),
  }));
  mock.module("@/lib/jobs/service", () => ({
    createBackgroundJob: async (input: Record<string, unknown>) => {
      createdJobs.push(input);
      return { id: "job-9" };
    },
  }));
  mock.module("@/lib/workflows/client", () => ({
    triggerAnnouncementWorkflow: async (input: Record<string, unknown>) => {
      triggeredWorkflows.push(input);
      return "wfr_job-9";
    },
    isWorkflowEnabled: () => true,
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
            findMany: async () => [
              {
                id: "p-1",
                userId: "u-1",
                phone: "5511999999999",
                email: "p@example.com",
                name: "Pessoa",
              },
            ],
          }),
        },
      ),
    },
  }));
}

installMocks();

let loadId = 0;
async function loadSendAnnouncementAction() {
  const suffix = `?wave5=${++loadId}`;
  const loaded = await import(
    `@/app/actions/notifications/announcement${suffix}`
  );
  return loaded.sendAnnouncementAction;
}

function form(channels: string[]): FormData {
  const data = new FormData();
  data.set("title", "Aviso importante");
  data.set("body", "Mensagem de teste");
  data.set("audienceType", "all");
  for (const channel of channels) data.append("channels", channel);
  return data;
}

const originalNodeEnv = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(originalNodeEnv ?? "test");
  dispatchCalls.length = 0;
  createdJobs.length = 0;
  triggeredWorkflows.length = 0;
  afterCalls.length = 0;
  installMocks();
});

describe("sendAnnouncementAction em background", () => {
  it("cria job, dispara workflow e responde queued sem despachar na action", async () => {
    setNodeEnv("production");
    const sendAnnouncementAction = await loadSendAnnouncementAction();

    const result = await sendAnnouncementAction(
      undefined,
      form(["whatsapp", "email"]),
    );

    expect(result).toEqual({ success: true, queued: true });
    expect(createdJobs).toHaveLength(1);
    expect(createdJobs[0]).toMatchObject({
      type: "bulk_notification",
      autoStart: false,
    });
    expect(triggeredWorkflows).toHaveLength(1);
    expect(triggeredWorkflows[0]).toMatchObject({
      jobId: "job-9",
      organizationId: "org-1",
      actorId: "user-1",
      sendWhatsApp: true,
      sendEmail: true,
      targetType: "all",
    });
    expect(dispatchCalls).toHaveLength(0);
    expect(afterCalls).toHaveLength(0);
  });

  it("mantém disparo síncrono em NODE_ENV=test", async () => {
    setNodeEnv("test");
    const sendAnnouncementAction = await loadSendAnnouncementAction();

    const result = await sendAnnouncementAction(undefined, form(["whatsapp"]));

    expect(result).toEqual({ success: true });
    expect(dispatchCalls).toHaveLength(1);
    expect(createdJobs).toHaveLength(0);
    expect(triggeredWorkflows).toHaveLength(0);
  });
});

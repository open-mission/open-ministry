import { describe, expect, it, mock } from "bun:test";
import { z } from "zod";

mock.module("server-only", () => ({}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

const realSchema = await import("@openministry/db");

let mockContext: {
  session: { user: { id: string } };
  organization: { id: string };
  isAdmin: boolean;
} | null = null;

const channelRow = {
  id: "channel-1",
  organizationId: "org-1",
  apiUrl: "https://evolution.example.com",
  apiKey: "evo-api-key-should-not-leak",
  instanceName: "church-instance",
  isActive: true,
  webhookSecret: "webhook-secret-should-not-leak",
};

let mockLogRow: { personId: string | null } | null = null;
let mockMembershipRow: { departmentId: string; personId: string } | null = null;

mock.module("@/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: (_target, table: string) => ({
          findFirst: async () =>
            table === "organizationNotificationChannel"
              ? channelRow
              : table === "whatsappMessageLog"
                ? mockLogRow
                : table === "departmentMember"
                  ? mockMembershipRow
                  : null,
        }),
      },
    ),
  },
  schema: realSchema.schema,
}));

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => mockContext,
  requireOrganizationContext: async () => mockContext,
}));

mock.module("@/lib/session", () => ({
  getSession: async () => mockContext?.session ?? null,
}));

mock.module("@/lib/app-url", () => ({
  getAppBaseUrl: () => "https://app.test",
}));

mock.module("@/lib/evolution-api", () => ({
  checkEvolutionConnection: async () => ({ ok: false }),
  configureEvolutionWebhook: async () => ({ ok: true }),
  formatPhoneNumberForEvolution: () => null,
  sendEvolutionTextMessage: async () => ({ ok: true }),
}));

const listLogsCalls: Array<{
  organizationId: string;
  options?: Record<string, unknown>;
}> = [];
const retryCalls: Array<{ logId: string; organizationId: string }> = [];
const retryAllCalls: Array<{
  organizationId: string;
  batchId?: string;
  departmentIds?: string[];
}> = [];

function resetServiceCalls() {
  listLogsCalls.length = 0;
  retryCalls.length = 0;
  retryAllCalls.length = 0;
}

mock.module("@/lib/notification-service", () => ({
  listEvolutionMessageLogs: async (
    organizationId: string,
    options?: Record<string, unknown>,
  ) => {
    listLogsCalls.push({ organizationId, options });
    return { logs: [], total: 0 };
  },
  retryWhatsAppMessage: async (logId: string, organizationId: string) => {
    retryCalls.push({ logId, organizationId });
    return { ok: true };
  },
  retryFailedWhatsAppMessages: async (
    organizationId: string,
    batchId?: string,
    departmentIds?: string[],
  ) => {
    retryAllCalls.push({ organizationId, batchId, departmentIds });
    return { total: 0, sent: 0, failed: 0 };
  },
}));

mock.module("@/lib/people", () => ({
  syncPersonProfile: async () => {},
  listPeople: async () => [],
}));

let mockIsLeader = false;
let mockLedDepartments: Array<{ id: string; name: string }> = [];

mock.module("@/lib/departments", () => ({
  isUserLeaderInAnyDepartment: async () => mockIsLeader,
  listDepartments: async () => [],
  listUserLeaderDepartments: async () => mockLedDepartments,
}));

mock.module("@/lib/message-templates-server", () => ({
  getOrganizationMessageTemplates: async () => [],
}));

mock.module("@/lib/profile", () => ({
  birthdayFieldSchema: z.string().optional(),
  updateBirthday: async () => {},
}));

// "@/app/actions/permissions" NÃO é mockado: outros testes importam o módulo
// real e mock.module vaza entre arquivos no mesmo processo. A cadeia de
// imports dele (@/db, @/lib/cache, @/lib/organizations) já está mockada acima.

const {
  getEvolutionSettingsAction,
  getEvolutionMessageLogsAction,
  retryEvolutionMessageAction,
  retryAllFailedEvolutionMessagesAction,
} = await import("@/app/actions/settings");

describe("getEvolutionSettingsAction", () => {
  it("hides the WhatsApp gateway credentials from non-admin members", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };

    const result = await getEvolutionSettingsAction();

    expect(result).toEqual({
      id: null,
      apiUrl: "",
      apiKey: "",
      instanceName: "",
      isActive: false,
    });
    expect(result.apiKey).toBe("");
    expect(result.webhookSecret).toBeUndefined();
  });

  it("still returns the settings for organization admins", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };

    const result = await getEvolutionSettingsAction();

    expect(result.id).toBe("channel-1");
    expect(result.apiKey).toBe("evo-api-key-should-not-leak");
    expect(result.webhookSecret).toBe("webhook-secret-should-not-leak");
    expect(result.webhookUrl).toBe(
      "https://app.test/api/webhooks/evolution?token=webhook-secret-should-not-leak",
    );
  });

  it("returns empty settings when there is no organization context", async () => {
    mockContext = null;

    const result = await getEvolutionSettingsAction();

    expect(result.id).toBeNull();
    expect(result.apiKey).toBe("");
  });
});

describe("getEvolutionMessageLogsAction — escopo de líder", () => {
  it("admin consulta todos os logs da organização, sem escopo de departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    mockIsLeader = false;
    mockLedDepartments = [];
    resetServiceCalls();

    await getEvolutionMessageLogsAction({ limit: 5 });

    expect(listLogsCalls.length).toBe(1);
    expect(listLogsCalls[0]?.organizationId).toBe("org-1");
    expect(listLogsCalls[0]?.options?.departmentIds).toBeUndefined();
  });

  it("líder só recebe logs dos departamentos que lidera", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [
      { id: "dep-1", name: "Louvor" },
      { id: "dep-2", name: "Mídia" },
    ];
    resetServiceCalls();

    await getEvolutionMessageLogsAction({ limit: 5 });

    expect(listLogsCalls.length).toBe(1);
    expect(listLogsCalls[0]?.options?.departmentIds).toEqual([
      "dep-1",
      "dep-2",
    ]);
  });

  it("fail-closed: líder marcado como líder mas sem departamentos não vê nenhum log", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [];
    resetServiceCalls();

    const result = await getEvolutionMessageLogsAction({ limit: 5 });

    expect(result).toEqual({ logs: [], total: 0 });
    expect(listLogsCalls.length).toBe(0);
  });
});

describe("retryEvolutionMessageAction — escopo de líder", () => {
  it("admin reenvia qualquer mensagem da organização", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    mockLogRow = { personId: "p-1" };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await retryEvolutionMessageAction("log-1");

    expect(result).toEqual({ ok: true });
    expect(retryCalls[0]).toEqual({ logId: "log-1", organizationId: "org-1" });
  });

  it("líder reenvia mensagem de pessoa do seu departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: "p-1" };
    mockMembershipRow = { departmentId: "dep-1", personId: "p-1" };
    resetServiceCalls();

    const result = await retryEvolutionMessageAction("log-1");

    expect(result).toEqual({ ok: true });
    expect(retryCalls[0]).toEqual({ logId: "log-1", organizationId: "org-1" });
  });

  it("líder não pode reenviar mensagem de pessoa fora do seu departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: "p-9" };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await retryEvolutionMessageAction("log-1");

    expect(result.ok).toBe(false);
    expect(retryCalls.length).toBe(0);
  });

  it("líder não reenvia mensagem sem pessoa vinculada (broadcast fora do escopo)", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: null };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await retryEvolutionMessageAction("log-1");

    expect(result.ok).toBe(false);
    expect(retryCalls.length).toBe(0);
  });

  it("fail-closed: líder sem departamentos não reenvia nada", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [];
    mockLogRow = { personId: "p-1" };
    resetServiceCalls();

    const result = await retryEvolutionMessageAction("log-1");

    expect(result.ok).toBe(false);
    expect(retryCalls.length).toBe(0);
  });
});

describe("retryAllFailedEvolutionMessagesAction — escopo de líder", () => {
  it("admin reenvia todos os falhados da organização", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    resetServiceCalls();

    await retryAllFailedEvolutionMessagesAction("batch-1");

    expect(retryAllCalls[0]).toEqual({
      organizationId: "org-1",
      batchId: "batch-1",
      departmentIds: undefined,
    });
  });

  it("líder reenvia apenas os falhados do seu departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    resetServiceCalls();

    await retryAllFailedEvolutionMessagesAction("batch-1");

    expect(retryAllCalls[0]).toEqual({
      organizationId: "org-1",
      batchId: "batch-1",
      departmentIds: ["dep-1"],
    });
  });

  it("fail-closed: líder sem departamentos não reenvia nada", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [];
    resetServiceCalls();

    const result = await retryAllFailedEvolutionMessagesAction("batch-1");

    expect(result).toEqual({ total: 0, sent: 0, failed: 0 });
    expect(retryAllCalls.length).toBe(0);
  });
});

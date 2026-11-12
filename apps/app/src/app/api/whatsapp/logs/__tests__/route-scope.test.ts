import { describe, expect, it, mock } from "bun:test";

mock.module("next/server", () => ({
  connection: async () => {},
}));

let mockContext: {
  session: { user: { id: string } };
  organization: { id: string };
  isAdmin: boolean;
} | null = null;

let mockIsLeader = false;
let mockLedDepartments: Array<{ id: string; name: string }> = [];

const listLogsCalls: Array<{
  organizationId: string;
  options?: Record<string, unknown>;
}> = [];

function resetCalls() {
  listLogsCalls.length = 0;
}

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => mockContext,
}));

mock.module("@/lib/departments", () => ({
  isUserLeaderInAnyDepartment: async () => mockIsLeader,
  listUserLeaderDepartments: async () => mockLedDepartments,
}));

mock.module("@/lib/notification-service", () => ({
  listEvolutionMessageLogs: async (
    organizationId: string,
    options?: Record<string, unknown>,
  ) => {
    listLogsCalls.push({ organizationId, options });
    return { logs: [{ id: "log-1" }], total: 1 };
  },
}));

const { GET } = await import("@/app/api/whatsapp/logs/route");

function request() {
  return new Request("https://app.test/api/whatsapp/logs?limit=10&offset=0") as never;
}

describe("GET /api/whatsapp/logs — escopo de líder", () => {
  it("admin lista todos os logs da organização", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    mockIsLeader = false;
    mockLedDepartments = [];
    resetCalls();

    const response = await GET(request());
    const data = (await response.json()) as { logs: unknown[]; total: number };

    expect(response.status).toBe(200);
    expect(listLogsCalls[0]?.organizationId).toBe("org-1");
    expect(listLogsCalls[0]?.options?.departmentIds).toBeUndefined();
    expect(data.total).toBe(1);
  });

  it("líder lista apenas logs dos departamentos que lidera", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    resetCalls();

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(listLogsCalls[0]?.options?.departmentIds).toEqual(["dep-1"]);
  });

  it("fail-closed: líder sem departamentos não vê nenhum log", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [];
    resetCalls();

    const response = await GET(request());
    const data = (await response.json()) as { logs: unknown[]; total: number };

    expect(response.status).toBe(200);
    expect(data).toEqual({ logs: [], total: 0 });
    expect(listLogsCalls.length).toBe(0);
  });

  it("membro comum sem papel de líder recebe 403", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = false;
    resetCalls();

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(listLogsCalls.length).toBe(0);
  });
});

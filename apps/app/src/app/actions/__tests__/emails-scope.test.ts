import { describe, expect, it, mock } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

mock.module("server-only", () => ({}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

let mockContext: {
  session: { user: { id: string } };
  organization: { id: string };
  isAdmin: boolean;
} | null = null;

let mockLogRow: { personId: string | null; userId: string | null } | null = null;
let mockMembershipRow: { id: string } | null = null;
let mockIsLeader = false;
let mockLedDepartments: Array<{ id: string; name: string }> = [];

const findFirstCalls: Array<{ table: string; where?: unknown }> = [];

mock.module("@/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: (_target, table: string) => ({
          findFirst: async (args: { where?: unknown }) => {
            findFirstCalls.push({ table, where: args?.where });
            return table === "emailMessageLog"
              ? mockLogRow
              : table === "departmentMember"
                ? mockMembershipRow
                : null;
          },
          findMany: async () => [],
        }),
      },
    ),
  },
}));

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => mockContext,
  requireOrganizationContext: async () => mockContext,
}));

mock.module("@/lib/departments", () => ({
  isUserLeaderInAnyDepartment: async () => mockIsLeader,
  listDepartments: async () => [],
  listUserLeaderDepartments: async () => mockLedDepartments,
}));

const listLogsCalls: Array<{
  organizationId: string;
  options?: Record<string, unknown>;
}> = [];
const resendCalls: Array<{
  logId: string;
  targetEmailOverride?: string;
  organizationId?: string;
}> = [];

function resetServiceCalls() {
  listLogsCalls.length = 0;
  resendCalls.length = 0;
  findFirstCalls.length = 0;
}

mock.module("@/lib/email/service", () => ({
  listEmailMessageLogs: async (
    organizationId: string,
    options?: Record<string, unknown>,
  ) => {
    listLogsCalls.push({ organizationId, options });
    return { logs: [], stats: { total: 0, sent: 0, failed: 0 } };
  },
  resendLoggedEmail: async (
    logId: string,
    targetEmailOverride?: string,
    organizationId?: string,
  ) => {
    resendCalls.push({ logId, targetEmailOverride, organizationId });
    return { ok: true };
  },
  sendTestEmail: async () => ({ ok: true }),
}));

const { listEmailLogsAction, resendEmailAction } = await import(
  "@/app/actions/emails"
);

const dialect = new PgDialect();
function renderWhere(where: unknown): string {
  return dialect
    .sqlToQuery(where as unknown as SQL)
    .sql.replaceAll('"', "");
}

describe("listEmailLogsAction — escopo de líder", () => {
  it("admin consulta todos os logs da organização, sem escopo de departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    resetServiceCalls();

    const result = await listEmailLogsAction({ limit: 5 });

    expect(result.ok).toBe(true);
    expect(listLogsCalls.length).toBe(1);
    expect(listLogsCalls[0]?.organizationId).toBe("org-1");
    expect(listLogsCalls[0]?.options?.departmentIds).toBeUndefined();
    expect(listLogsCalls[0]?.options?.viewerUserId).toBe("user-1");
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

    const result = await listEmailLogsAction({ limit: 5 });

    expect(result.ok).toBe(true);
    expect(listLogsCalls.length).toBe(1);
    expect(listLogsCalls[0]?.options?.departmentIds).toEqual([
      "dep-1",
      "dep-2",
    ]);
  });

  it("fail-closed: líder marcado como líder mas sem departamentos não consulta nada", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [];
    resetServiceCalls();

    const result = await listEmailLogsAction({ limit: 5 });

    expect(result.ok).toBe(true);
    expect(result.logs).toEqual([]);
    expect(result.stats).toEqual({ total: 0, sent: 0, failed: 0 });
    expect(listLogsCalls.length).toBe(0);
  });

  it("membro comum sem papel de líder não vê os logs", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = false;
    mockLedDepartments = [];
    resetServiceCalls();

    const result = await listEmailLogsAction({ limit: 5 });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(listLogsCalls.length).toBe(0);
  });
});

describe("resendEmailAction — escopo", () => {
  it("admin reenvia log da organização e a busca é escopada por organization_id", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    mockLogRow = { personId: "p-1", userId: null };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await resendEmailAction("log-1");

    expect(result).toEqual({ ok: true });
    expect(resendCalls[0]).toEqual({
      logId: "log-1",
      targetEmailOverride: undefined,
      organizationId: "org-1",
    });

    const logFetch = findFirstCalls.find(
      (call) => call.table === "emailMessageLog",
    );
    expect(logFetch).toBeTruthy();
    const where = renderWhere(logFetch?.where);
    expect(where).toContain("email_message_log.organization_id");
  });

  it("admin não reenvia log de outra organização", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: true,
    };
    mockLogRow = null;
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await resendEmailAction("log-de-outra-igreja");

    expect(result.ok).toBe(false);
    expect(resendCalls.length).toBe(0);
  });

  it("líder reenvia e-mail de pessoa do seu departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: "p-1", userId: null };
    mockMembershipRow = { id: "dm-1" };
    resetServiceCalls();

    const result = await resendEmailAction("log-1");

    expect(result).toEqual({ ok: true });
    expect(resendCalls[0]?.organizationId).toBe("org-1");
  });

  it("líder reenvia o próprio e-mail de autenticação (mesmo sem pessoa vinculada)", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: null, userId: "user-1" };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await resendEmailAction("log-1");

    expect(result).toEqual({ ok: true });
    expect(resendCalls.length).toBe(1);
  });

  it("líder não reenvia e-mail de pessoa fora do seu departamento", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: "p-9", userId: null };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await resendEmailAction("log-1");

    expect(result.ok).toBe(false);
    expect(resendCalls.length).toBe(0);
  });

  it("líder não reenvia e-mail sem pessoa e sem usuário (broadcast fora do escopo)", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [{ id: "dep-1", name: "Louvor" }];
    mockLogRow = { personId: null, userId: null };
    mockMembershipRow = null;
    resetServiceCalls();

    const result = await resendEmailAction("log-1");

    expect(result.ok).toBe(false);
    expect(resendCalls.length).toBe(0);
  });

  it("fail-closed: líder sem departamentos não reenvia nada", async () => {
    mockContext = {
      session: { user: { id: "user-1" } },
      organization: { id: "org-1" },
      isAdmin: false,
    };
    mockIsLeader = true;
    mockLedDepartments = [];
    mockLogRow = { personId: "p-1", userId: null };
    resetServiceCalls();

    const result = await resendEmailAction("log-1");

    expect(result.ok).toBe(false);
    expect(resendCalls.length).toBe(0);
  });
});

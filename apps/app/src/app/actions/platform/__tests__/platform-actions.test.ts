import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));

let auditInserts: Record<string, unknown>[] = [];
let roleChanges: { userId: string; role: string }[] = [];

const integrationRow = {
  id: "int-1",
  provider: "evolution_whatsapp",
  displayName: "Evolution API Go (Evogo)",
  isEnabled: true,
  configJson: { apiUrl: "https://evo.example.com" },
  encryptedSecrets: "enc:v1:abcdef123456",
  lastHealthStatus: "healthy",
  lastHealthLatencyMs: 48,
  lastHealthCheckedAt: new Date(),
  lastHealthError: null,
};

const operatorRows = [
  {
    id: "user-1",
    name: "Dono",
    email: "dono@empresa.test",
    role: "super_admin",
    createdAt: new Date(),
  },
  {
    id: "user-2",
    name: "Operador",
    email: "ops@empresa.test",
    role: "super_admin",
    createdAt: new Date(),
  },
];

mock.module("@/db", () => ({
  db: {
    query: {
      platformIntegrationConfig: {
        findMany: async () => [integrationRow],
        findFirst: async () => integrationRow,
      },
      platformPlan: {
        findMany: async () => [],
        findFirst: async () => null,
      },
      user: {
        findMany: async () => operatorRows,
        findFirst: async () => operatorRows[1],
      },
      platformAuditLog: {
        findMany: async () => [],
      },
    },
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        auditInserts.push(values);
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => ({ rowCount: 1 }),
      }),
    }),
    select: () => ({
      from: () => ({ where: async () => [{ count: 0 }] }),
    }),
  },
  schema: {
    platformAuditLog: {
      action: "action",
      summary: "summary",
      actorEmail: "actor_email",
      createdAt: "created_at",
    },
    platformIntegrationConfig: { provider: "provider", id: "id" },
    user: { id: "id", email: "email", role: "role", createdAt: "created_at" },
  },
}));

mock.module("@/lib/platform/auth", () => ({
  requireSuperAdmin: async () => ({
    user: { id: "admin-1", email: "admin@empresa.test", role: "super_admin" },
    session: {},
  }),
}));

mock.module("@/lib/cache", () => ({
  remember: async (_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
    fetcher(),
  cacheDelete: async () => {},
  cacheInvalidateTags: async () => {},
  cacheGet: async () => null,
  cacheSet: async () => {},
}));

mock.module("@/lib/secret-crypto", () => ({
  decryptSecret: (value: string | null) => (value ? "global-secret-1234" : null),
  encryptSecret: (value: string) => `enc:${value}`,
}));

const fetchCalls: { url: string; init?: RequestInit }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  fetchCalls.push({ url, init });
  return new Response(JSON.stringify({ data: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      setRole: async ({ body }: { body: { userId: string; role: string } }) => {
        roleChanges.push(body);
        return { success: true };
      },
    },
  },
}));

afterAll(() => {
  globalThis.fetch = realFetch;
});

const { listPlatformIntegrationsAction, saveEvolutionPlatformIntegrationAction } =
  await import("@/app/actions/platform/integrations");
const { revokePlatformOperatorAction } = await import(
  "@/app/actions/platform/operators"
);

describe("actions da plataforma", () => {
  it("lista integrações com máscara e hasSecret, sem vazar segredos", async () => {
    const integrations = await listPlatformIntegrationsAction();
    expect(integrations[0].hasSecret).toBe(true);
    expect(integrations[0].maskedSecret).toBe("••••1234");
    const serialized = JSON.stringify(integrations);
    expect(serialized).not.toContain("global-secret-1234");
    expect(serialized).not.toContain("enc:v1:abcdef123456");
  });

  it("grava auditoria ao salvar integração sem expor a chave", async () => {
    auditInserts = [];
    const result = await saveEvolutionPlatformIntegrationAction({
      apiUrl: "https://evo.example.com",
      globalApiKey: "nova-chave-secreta",
      isEnabled: true,
    });
    expect(result.ok).toBe(true);
    expect(auditInserts.length).toBe(1);
    expect(JSON.stringify(auditInserts)).not.toContain("nova-chave-secreta");
    expect(auditInserts[0].action).toBe("integration.evolution_saved");
  });

  it("bloqueia revogação de operador bootstrap", async () => {
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "dono@empresa.test";
    const result = await revokePlatformOperatorAction("user-1");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("bootstrap");
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = "";
  });

  it("bloqueia remoção do último operador", async () => {
    operatorRows.length = 1;
    const result = await revokePlatformOperatorAction("user-1");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("último");
  });

  it("revoga operador normal via API nativa e registra auditoria", async () => {
    operatorRows.push({
      id: "user-2",
      name: "Operador",
      email: "ops@empresa.test",
      role: "super_admin",
      createdAt: new Date(),
    });
    roleChanges = [];
    auditInserts = [];
    const result = await revokePlatformOperatorAction("user-2");
    expect(result.ok).toBe(true);
    expect(roleChanges).toEqual([{ userId: "user-2", role: "user" }]);
    expect(auditInserts[0].action).toBe("operator.revoked");
  });
});

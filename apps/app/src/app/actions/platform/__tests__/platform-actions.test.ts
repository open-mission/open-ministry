import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));

let auditInserts: Record<string, unknown>[] = [];
let roleChanges: { userId: string; role: string }[] = [];
let transactionUpdates: { role: string }[] = [];
let integrationUpdates: Record<string, unknown>[] = [];
let userToPromote: {
  id: string;
  email: string;
  role: string | null;
  emailVerified?: boolean;
} | null = null;

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
        findFirst: async () => userToPromote ?? operatorRows[1],
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
      set: (values: Record<string, unknown>) => {
        integrationUpdates.push(values);
        return { where: async () => ({ rowCount: 1 }) };
      },
    }),
    select: () => ({
      from: () => ({ where: async () => [{ count: 0 }] }),
    }),
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        execute: async () => ({ rows: operatorRows.map((row) => ({ id: row.id })) }),
        update: () => ({
          set: (values: { role: string }) => ({
            where: async () => {
              transactionUpdates.push({ role: values.role });
            },
          }),
        }),
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

const {
  listPlatformIntegrationsAction,
  saveEvolutionPlatformIntegrationAction,
  resetPlatformIntegrationToEnvAction,
} = await import("@/app/actions/platform/integrations");
const { revokePlatformOperatorAction, promotePlatformOperatorAction } =
  await import("@/app/actions/platform/operators");

describe("actions da plataforma", () => {
  it("lista integrações com máscara e hasSecret, sem vazar segredos", async () => {
    const integrations = await listPlatformIntegrationsAction();
    expect(integrations[0].hasSecret).toBe(true);
    expect(integrations[0].maskedSecret).toBe("••••1234");
    const serialized = JSON.stringify(integrations);
    expect(serialized).not.toContain("global-secret-1234");
    expect(serialized).not.toContain("enc:v1:abcdef123456");
  });

  it("devolve os 4 provedores com origem, fallback e máscaras", async () => {
    const integrations = await listPlatformIntegrationsAction();
    expect(integrations.map((item) => item.provider)).toEqual([
      "evolution_whatsapp",
      "brevo_email",
      "web_push",
      "meta_whatsapp_cloud",
    ]);
    for (const item of integrations) {
      expect(item.source).toBeDefined();
      expect(typeof item.hasEnvFallback).toBe("boolean");
      expect(typeof item.isEnabled).toBe("boolean");
      expect(item.secretMasks).toBeDefined();
    }
    const serialized = JSON.stringify(integrations);
    expect(serialized).not.toContain("global-secret-1234");
    expect(serialized).not.toContain("enc:v1:abcdef123456");
  });

  it("restaura o padrão do .env com auditoria e sem segredo gravado", async () => {
    integrationUpdates = [];
    auditInserts = [];
    const result = await resetPlatformIntegrationToEnvAction("brevo_email");
    expect(result.ok).toBe(true);
    expect(integrationUpdates[0]).toMatchObject({
      configJson: { source: "env" },
      encryptedSecrets: null,
      isEnabled: true,
    });
    expect(auditInserts[0].action).toBe("integration.reset_to_env");
    expect(JSON.stringify(auditInserts)).not.toContain("secret");
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
    transactionUpdates = [];
    auditInserts = [];
    const result = await revokePlatformOperatorAction("user-2");
    expect(result.ok).toBe(true);
    expect(transactionUpdates).toEqual([{ role: "user" }]);
    expect(auditInserts[0].action).toBe("operator.revoked");
  });

  it("exige e-mail verificado ao promover operador", async () => {
    userToPromote = {
      id: "user-3",
      email: "novo@empresa.test",
      role: "user",
      emailVerified: false,
    };
    roleChanges = [];
    const result = await promotePlatformOperatorAction("novo@empresa.test");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Confirme o e-mail");
    expect(roleChanges).toEqual([]);
    userToPromote = null;
  });

  it("promove operador com e-mail verificado", async () => {
    userToPromote = {
      id: "user-3",
      email: "novo@empresa.test",
      role: "user",
      emailVerified: true,
    };
    roleChanges = [];
    const result = await promotePlatformOperatorAction("novo@empresa.test");
    expect(result.ok).toBe(true);
    expect(roleChanges).toEqual([
      { userId: "user-3", role: "super_admin" },
    ]);
    userToPromote = null;
  });

  it("bloqueia auto-revogação do próprio operador", async () => {
    const result = await revokePlatformOperatorAction("admin-1");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("próprio acesso");
  });
});

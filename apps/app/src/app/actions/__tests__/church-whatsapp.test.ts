import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let channel: Record<string, unknown> | null = null;
let entitlementsEnabled = true;

mock.module("@/lib/organizations", () => ({
  getOrganizationContext: async () => ({
    organization: { id: "org-1", name: "Igreja PCM", slug: "igreja-pcm" },
    isAdmin: true,
  }),
}));

mock.module("@/lib/app-url", () => ({ getAppBaseUrl: () => "https://app.test" }));

mock.module("@/lib/cache", () => ({
  remember: async (_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
    fetcher(),
  cacheDelete: async () => {},
  cacheInvalidateTags: async () => {},
  cacheGet: async () => null,
  cacheSet: async () => {},
}));

mock.module("@/lib/platform/evolution-config", () => ({
  getPlatformEvolutionConfig: async () => ({
    apiUrl: "https://evo.example.com",
    globalApiKey: "GLOBAL_SECRET_DO_NOT_LEAK",
  }),
}));

mock.module("@/lib/secret-crypto", () => ({
  encryptSecret: (value: string) => `enc:${value}`,
  decryptSecret: (value: string | null) => (value ? "INSTANCE_TOKEN" : null),
}));

const realFetch = globalThis.fetch;
const fetchCalls: { url: string; init?: RequestInit }[] = [];
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  fetchCalls.push({ url, init });
  const body = url.endsWith("/instance/connect")
    ? { base64: "QRBASE64" }
    : url.includes("/instance/create")
      ? { token: "token-criado" }
      : { data: [] };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

let inserted: Record<string, unknown> | null = null;
let lastUpdate: Record<string, unknown> | null = null;
mock.module("@/db", () => ({
  db: {
    query: {
      organizationNotificationChannel: {
        findFirst: async () => channel,
      },
      organizationPlatformSettings: {
        findFirst: async () => ({
          organizationId: "org-1",
          planId: "plan_pro",
          status: entitlementsEnabled ? "active" : "suspended",
          featureOverrides: {},
          notes: null,
        }),
      },
      platformPlan: {
        findFirst: async () => ({
          id: "plan_pro",
          slug: "pro",
          name: "Pro",
          featuresJson: {
            whatsapp_notifications: true,
            whatsapp_max_instances: 1,
          },
          isDefault: false,
        }),
      },
      platformIntegrationConfig: {
        findFirst: async () => ({
          provider: "evolution_whatsapp",
          isEnabled: true,
          encryptedSecrets: "enc:v1:x",
          lastHealthStatus: "healthy",
        }),
      },
    },
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        inserted = values;
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        lastUpdate = values;
        return { where: async () => ({ rowCount: 1 }) };
      },
    }),
  },
  schema: {
    organizationNotificationChannel: {
      organizationId: "organization_id",
      channel: "channel",
    },
    organizationPlatformSettings: {
      organizationId: "organization_id",
    },
    platformPlan: { id: "id", isDefault: "is_default" },
    platformIntegrationConfig: { provider: "provider" },
  },
}));

afterAll(() => {
  globalThis.fetch = realFetch;
});

const { getOrganizationEvolutionConfig } = await import(
  "@/lib/notification-service"
);

const {
  getChurchWhatsAppViewAction,
  createChurchWhatsAppInstanceAction,
  refreshChurchWhatsAppQrAction,
  toggleChurchWhatsAppActiveAction,
} = await import("@/app/actions/church-whatsapp");

describe("WhatsApp gerenciado da igreja", () => {
  it("estado bloqueado não expõe campos técnicos", async () => {
    entitlementsEnabled = false;
    channel = null;
    const view = await getChurchWhatsAppViewAction();
    expect(view?.state).toBe("blocked");
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("apiUrl");
    expect(serialized).not.toContain("GLOBAL_SECRET");
  });

  it("estado pronto mostra apenas passos simples", async () => {
    entitlementsEnabled = true;
    channel = null;
    const view = await getChurchWhatsAppViewAction();
    expect(view?.state).toBe("ready");
  });

  it("cria instância usando credenciais apenas no servidor", async () => {
    entitlementsEnabled = true;
    channel = null;
    const result = await createChurchWhatsAppInstanceAction();
    expect(result.ok).toBe(true);
    expect(result.qrCode).toBe("QRBASE64");
    expect(fetchCalls.some((call) => call.url.includes("/instance/create"))).toBe(true);
    expect(fetchCalls.some((call) => call.url.includes("/instance/connect"))).toBe(true);
    const serialized = JSON.stringify(result) + JSON.stringify(inserted);
    expect(serialized).not.toContain("GLOBAL_SECRET_DO_NOT_LEAK");
    expect(serialized).not.toContain("https://evo.example.com");
  });

  it("bloqueia renovação de QR em igreja suspensa", async () => {
    entitlementsEnabled = false;
    channel = { id: "ch-1", instanceName: "igreja-pcm", instanceToken: "enc:token", webhookSecret: "secret-1" };
    const result = await refreshChurchWhatsAppQrAction();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("não liberado");
    entitlementsEnabled = true;
  });

  it("bloqueia ativação do canal em igreja suspensa", async () => {
    entitlementsEnabled = false;
    const result = await toggleChurchWhatsAppActiveAction(true);
    expect(result.ok).toBe(false);
    entitlementsEnabled = true;
  });

  it("migra canal legado e remove apiUrl/apiKey", async () => {
    entitlementsEnabled = true;
    channel = {
      id: "ch-legacy",
      organizationId: "org-1",
      instanceName: "igreja-legada",
      apiUrl: "https://api-antiga.example.com",
      apiKey: "legado-secreto",
      managedByPlatform: false,
    };
    const result = await createChurchWhatsAppInstanceAction();
    expect(result.ok).toBe(true);
    expect(lastUpdate).toMatchObject({
      managedByPlatform: true,
      apiUrl: null,
      apiKey: null,
    });
    expect(JSON.stringify(lastUpdate)).not.toContain("legado-secreto");
  });

  it("persiste webhookSecret ausente antes de renovar o QR", async () => {
    entitlementsEnabled = true;
    lastUpdate = null;
    channel = {
      id: "ch-2",
      instanceName: "igreja-pcm",
      instanceToken: "enc:token",
      webhookSecret: null,
      managedByPlatform: true,
    };
    const result = await refreshChurchWhatsAppQrAction();
    expect(result.ok).toBe(true);
    const update = lastUpdate as Record<string, unknown> | null;
    expect(update?.webhookSecret).toBeTruthy();
    expect(update?.webhookSecret).not.toBeNull();
  });
});

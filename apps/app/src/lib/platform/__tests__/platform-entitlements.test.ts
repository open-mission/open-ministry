import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let settingsRow: {
  organizationId: string;
  planId: string | null;
  status: string;
  featureOverrides: Record<string, unknown>;
} | null = null;
let planRow: {
  id: string;
  slug: string;
  name: string;
  featuresJson: Record<string, unknown>;
  isDefault: boolean;
} | null = null;
let integrationRow: {
  provider: string;
  isEnabled: boolean;
  encryptedSecrets: string | null;
  lastHealthStatus: string | null;
} | null = null;

mock.module("@/db", () => ({
  db: {
    query: {
      organizationPlatformSettings: {
        findFirst: async () => settingsRow,
      },
      platformPlan: {
        findFirst: async () => planRow,
      },
      platformIntegrationConfig: {
        findFirst: async () => integrationRow,
      },
      organizationNotificationChannel: {
        findFirst: async () => legacyChannelRow,
      },
    },
  },
  schema: {
    organizationPlatformSettings: { organizationId: "organization_id", planId: "plan_id" },
    platformPlan: { id: "id", isDefault: "is_default" },
    platformIntegrationConfig: { provider: "provider" },
    organizationNotificationChannel: {
      organizationId: "organization_id",
      channel: "channel",
    },
  },
}));

mock.module("@/lib/cache", () => ({
  remember: async (_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
    fetcher(),
  cacheDelete: async () => {},
  cacheInvalidateTags: async () => {},
}));

let legacyChannelRow: {
  organizationId: string;
  isActive: boolean;
  instanceName: string;
  apiUrl: string | null;
  apiKey: string | null;
  instanceToken: string | null;
  managedByPlatform: boolean;
} | null = null;

let platformConfig: { apiUrl: string; globalApiKey: string } | null = null;

mock.module("@/lib/platform/evolution-config", () => ({
  getPlatformEvolutionConfig: async () => platformConfig,
}));

mock.module("@/lib/secret-crypto", () => ({
  decryptSecret: (value: string | null) => (value ? `decrypted:${value}` : null),
}));

const { getOrganizationEntitlements } = await import(
  "@/lib/platform/entitlements"
);
const { getOrganizationEvolutionConfig } = await import(
  "@/lib/notification-service"
);

const FREE = {
  id: "plan_free",
  slug: "free",
  name: "Gratuito",
  featuresJson: { whatsapp_notifications: false, whatsapp_max_instances: 0 },
  isDefault: true,
};
const PRO = {
  id: "plan_pro",
  slug: "pro",
  name: "Pro",
  featuresJson: { whatsapp_notifications: true, whatsapp_max_instances: 1 },
  isDefault: false,
};

function setup(overrides: {
  plan?: typeof FREE | null;
  status?: string;
  overrides?: Record<string, unknown>;
  integrationEnabled?: boolean;
  hasSecret?: boolean;
}) {
  settingsRow = {
    organizationId: "org-1",
    planId: overrides.plan?.id ?? null,
    status: overrides.status ?? "active",
    featureOverrides: overrides.overrides ?? {},
  };
  planRow = overrides.plan === undefined ? FREE : overrides.plan;
  integrationRow = {
    provider: "evolution_whatsapp",
    isEnabled: overrides.integrationEnabled ?? true,
    encryptedSecrets: overrides.hasSecret === false ? null : "enc:v1:xxx",
    lastHealthStatus: "healthy",
  };
}

describe("getOrganizationEntitlements", () => {
  it("plano free desliga WhatsApp", async () => {
    setup({});
    const result = await getOrganizationEntitlements("org-1");
    expect(result.whatsapp.enabled).toBe(false);
    expect(result.whatsapp.maxInstances).toBe(0);
  });

  it("plano pro liga WhatsApp com limite do plano", async () => {
    setup({ plan: PRO });
    const result = await getOrganizationEntitlements("org-1");
    expect(result.whatsapp.enabled).toBe(true);
    expect(result.whatsapp.maxInstances).toBe(1);
  });

  it("override manual liga recurso mesmo no free", async () => {
    setup({ overrides: { whatsapp_notifications: true, whatsapp_max_instances: 2 } });
    const result = await getOrganizationEntitlements("org-1");
    expect(result.whatsapp.enabled).toBe(true);
    expect(result.whatsapp.maxInstances).toBe(2);
  });

  it("organização suspensa desliga tudo", async () => {
    setup({ plan: PRO, status: "suspended" });
    const result = await getOrganizationEntitlements("org-1");
    expect(result.status).toBe("suspended");
    expect(result.whatsapp.enabled).toBe(false);
    expect(result.whatsapp.maxInstances).toBe(0);
  });

  it("provedor global desligado desliga recurso", async () => {
    setup({ plan: PRO, integrationEnabled: false });
    const result = await getOrganizationEntitlements("org-1");
    expect(result.whatsapp.providerAvailable).toBe(false);
    expect(result.whatsapp.enabled).toBe(false);
  });

  it("nunca devolve segredos nem URL global", async () => {
    setup({ plan: PRO });
    const serialized = JSON.stringify(await getOrganizationEntitlements("org-1"));
    expect(serialized).not.toContain("enc:v1");
    expect(serialized).not.toContain("globalApiKey");
    expect(serialized).not.toContain("apiUrl");
  });
});

describe("getOrganizationEvolutionConfig (resolver da igreja)", () => {
  it("usa URL e chave da plataforma quando managedByPlatform", async () => {
    setup({ plan: PRO });
    platformConfig = { apiUrl: "https://evo.example.com", globalApiKey: "global-key" };
    legacyChannelRow = {
      organizationId: "org-1",
      isActive: true,
      instanceName: "igreja-1",
      apiUrl: null,
      apiKey: null,
      instanceToken: "enc:v1:instance",
      managedByPlatform: true,
    };
    const result = await getOrganizationEvolutionConfig("org-1");
    expect(result.config).toEqual({
      apiUrl: "https://evo.example.com",
      apiKey: "decrypted:enc:v1:instance",
      instanceName: "igreja-1",
    });
    expect(JSON.stringify(result)).not.toContain("global-key");
  });

  it("mantém compatibilidade com registro legado", async () => {
    setup({ plan: PRO });
    legacyChannelRow = {
      organizationId: "org-1",
      isActive: true,
      instanceName: "legado",
      apiUrl: "https://legacy.example.com",
      apiKey: "enc:v1:legacy",
      instanceToken: null,
      managedByPlatform: false,
    };
    const result = await getOrganizationEvolutionConfig("org-1");
    expect(result.config?.apiUrl).toBe("https://legacy.example.com");
    expect(result.config?.apiKey).toBe("decrypted:enc:v1:legacy");
  });

  it("bloqueia envio quando o plano não libera WhatsApp", async () => {
    setup({ plan: FREE });
    platformConfig = { apiUrl: "https://evo.example.com", globalApiKey: "global-key" };
    legacyChannelRow = {
      organizationId: "org-1",
      isActive: true,
      instanceName: "igreja-1",
      apiUrl: null,
      apiKey: null,
      instanceToken: "enc:v1:instance",
      managedByPlatform: true,
    };
    const result = await getOrganizationEvolutionConfig("org-1");
    expect(result.config).toBeNull();
  });
});

import { afterEach, describe, expect, it } from "bun:test";

import {
  BREVO_ENV_CONFIG,
  BREVO_ENV_SECRETS,
  EVOLUTION_ENV_CONFIG,
  EVOLUTION_ENV_SECRETS,
  WEB_PUSH_ENV_CONFIG,
  WEB_PUSH_ENV_SECRETS,
  maskSecret,
  resolveIntegrationValues,
  type CachedIntegrationRow,
} from "@/lib/platform/integrations-config";

const ENV_KEYS = [
  "EVOLUTION_API_URL",
  "EVOLUTION_URL",
  "EVOLUTION_GLOBAL_API_KEY",
  "EVOLUTION_API_KEY",
  "BREVO_API_KEY",
  "BREVO_API",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "EMAIL_FROM",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "NEXT_PUBLIC_ONESIGNAL_APP_ID",
  "ONESIGNAL_APP_ID",
  "ONESIGNAL_REST_API_KEY",
];

const savedEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function row(overrides: Partial<CachedIntegrationRow> = {}): CachedIntegrationRow {
  return {
    id: "row-1",
    provider: "evolution_whatsapp",
    displayName: "Evolution",
    isEnabled: true,
    configJson: {},
    encryptedSecrets: null,
    lastHealthStatus: null,
    lastHealthLatencyMs: null,
    lastHealthCheckedAt: null,
    lastHealthError: null,
    ...overrides,
  };
}

const envConfig = { apiUrl: "https://evo.env" };
const envSecrets = { globalApiKey: "env-secret-1234" };

describe("precedência .env + plataforma", () => {
  it("sem linha no banco, usa .env e já nasce habilitado", () => {
    const result = resolveIntegrationValues({
      row: null,
      dbSecrets: {},
      envConfig,
      envSecrets,
    });
    expect(result.source).toBe("env");
    expect(result.isEnabled).toBe(true);
    expect(result.config.apiUrl).toBe("https://evo.env");
    expect(result.secrets.globalApiKey).toBe("env-secret-1234");
    expect(result.hasEnvFallback).toBe(true);
  });

  it("configJson.source = env também usa o .env como primário", () => {
    const result = resolveIntegrationValues({
      row: row({ configJson: { source: "env" } }),
      dbSecrets: {},
      envConfig,
      envSecrets,
    });
    expect(result.source).toBe("env");
    expect(result.secrets.globalApiKey).toBe("env-secret-1234");
  });

  it("toggle global salvo no banco desliga mesmo com .env preenchido", () => {
    const result = resolveIntegrationValues({
      row: row({ isEnabled: false }),
      dbSecrets: {},
      envConfig,
      envSecrets,
    });
    expect(result.isEnabled).toBe(false);
    expect(result.source).toBe("env");
  });

  it("customização no painel sobrescreve campos e segredos do .env", () => {
    const result = resolveIntegrationValues({
      row: row({
        configJson: { source: "platform", apiUrl: "https://evo.custom" },
      }),
      dbSecrets: { globalApiKey: "db-secret-9999" },
      envConfig,
      envSecrets,
    });
    expect(result.source).toBe("platform");
    expect(result.config.apiUrl).toBe("https://evo.custom");
    expect(result.secrets.globalApiKey).toBe("db-secret-9999");
  });

  it("fallback parcial: segredo vazio no banco usa o segredo do .env", () => {
    const result = resolveIntegrationValues({
      row: row({
        configJson: { source: "platform", apiUrl: "https://evo.custom" },
      }),
      dbSecrets: { globalApiKey: "" },
      envConfig,
      envSecrets,
    });
    expect(result.config.apiUrl).toBe("https://evo.custom");
    expect(result.secrets.globalApiKey).toBe("env-secret-1234");
    expect(result.hasSecret).toBe(true);
  });

  it("sem .env e sem banco, fica unconfigured e desligado", () => {
    const result = resolveIntegrationValues({
      row: null,
      dbSecrets: {},
      envConfig: {},
      envSecrets: {},
    });
    expect(result.source).toBe("unconfigured");
    expect(result.isEnabled).toBe(false);
    expect(result.hasSecret).toBe(false);
  });

  it("reset para .env: sem customização, sem segredo e habilitado", () => {
    const result = resolveIntegrationValues({
      row: row({
        configJson: { source: "env" },
        encryptedSecrets: null,
        isEnabled: true,
      }),
      dbSecrets: {},
      envConfig,
      envSecrets,
    });
    expect(result.source).toBe("env");
    expect(result.isEnabled).toBe(true);
    expect(result.config.apiUrl).toBe("https://evo.env");
    expect(result.secrets.globalApiKey).toBe("env-secret-1234");
  });
  it("Brevo: customização parcial preserva sender e usa segredo do .env", () => {
    const result = resolveIntegrationValues({
      row: row({
        provider: "brevo_email",
        configJson: {
          source: "platform",
          senderEmail: "custom@igreja.test",
          senderName: "Igreja PCM",
        },
      }),
      dbSecrets: { apiKey: "" },
      envConfig: {
        senderEmail: "env@igreja.test",
        senderName: "OpenMinistry",
      },
      envSecrets: { apiKey: "env-brevo-key" },
    });
    expect(result.source).toBe("platform");
    expect(result.config.senderEmail).toBe("custom@igreja.test");
    expect(result.config.senderName).toBe("Igreja PCM");
    expect(result.secrets.apiKey).toBe("env-brevo-key");
  });

  it("Web Push: dois segredos independem um do outro no fallback", () => {
    const result = resolveIntegrationValues({
      row: row({
        provider: "web_push",
        configJson: {
          source: "platform",
          vapidPublicKey: "public-custom",
          oneSignalAppId: "app-custom",
        },
      }),
      dbSecrets: {
        vapidPrivateKey: "private-db",
        oneSignalRestApiKey: "",
      },
      envConfig: { vapidPublicKey: "public-env", oneSignalAppId: "" },
      envSecrets: {
        vapidPrivateKey: "private-env",
        oneSignalRestApiKey: "onesignal-env",
      },
    });
    expect(result.config.vapidPublicKey).toBe("public-custom");
    expect(result.config.oneSignalAppId).toBe("app-custom");
    expect(result.secrets.vapidPrivateKey).toBe("private-db");
    expect(result.secrets.oneSignalRestApiKey).toBe("onesignal-env");
  });
});

describe("máscaras", () => {
  it("mascara o segredo sem devolver o valor", () => {
    expect(maskSecret("super-secret-89ab")).toBe("••••89ab");
    expect(maskSecret(null)).toBeNull();
  });
});

describe("variáveis de ambiente e aliases", () => {
  it("Evolution usa nomes primários e aliases", () => {
    process.env.EVOLUTION_API_URL = " https://evo.primary ";
    process.env.EVOLUTION_GLOBAL_API_KEY = " primary-key ";
    expect(EVOLUTION_ENV_CONFIG().apiUrl).toBe("https://evo.primary");
    expect(EVOLUTION_ENV_SECRETS().globalApiKey).toBe("primary-key");

    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_GLOBAL_API_KEY;
    process.env.EVOLUTION_URL = "https://evo.alias";
    process.env.EVOLUTION_API_KEY = "alias-key";
    expect(EVOLUTION_ENV_CONFIG().apiUrl).toBe("https://evo.alias");
    expect(EVOLUTION_ENV_SECRETS().globalApiKey).toBe("alias-key");
  });

  it("Brevo aplica fallbacks de remetente", () => {
    for (const key of ["BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME", "EMAIL_FROM"]) {
      delete process.env[key];
    }
    expect(BREVO_ENV_CONFIG()).toEqual({
      senderEmail: "notificacoes@openministry.app",
      senderName: "OpenMinistry",
    });
    process.env.EMAIL_FROM = "fallback@igreja.test";
    expect(BREVO_ENV_CONFIG().senderEmail).toBe("fallback@igreja.test");
    delete process.env.BREVO_API_KEY;
    process.env.BREVO_API = "brevo-legado";
    expect(BREVO_ENV_SECRETS().apiKey).toBe("brevo-legado");
  });

  it("Web Push/VAPID e OneSignal leem nomes primários e aliases", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    process.env.VAPID_SUBJECT = "mailto:teste@openministry.app";
    process.env.ONESIGNAL_APP_ID = "onesignal-alias";
    process.env.ONESIGNAL_REST_API_KEY = "onesignal-key";
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    delete process.env.VAPID_PUBLIC_KEY;

    expect(WEB_PUSH_ENV_CONFIG()).toEqual({
      vapidPublicKey: "public-key",
      vapidSubject: "mailto:teste@openministry.app",
      oneSignalAppId: "onesignal-alias",
    });
    expect(WEB_PUSH_ENV_SECRETS()).toEqual({
      vapidPrivateKey: "private-key",
      oneSignalRestApiKey: "onesignal-key",
    });
  });
});

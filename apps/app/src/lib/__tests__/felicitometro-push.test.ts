import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const { formatDateStringInSaoPaulo, getTodayDateString } = await import(
  "@/lib/felicitometro-types"
);
const { getVapidConfig, isVapidConfigured } = await import(
  "@/lib/push-notifications"
);
const { POST, GET } = await import(
  "@/app/api/jobs/felicitometro-prompt/route"
);

const VAPID_ENV_KEYS = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

const savedEnv = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of VAPID_ENV_KEYS) {
    savedEnv.set(key, process.env[key]);
  }
  for (const key of VAPID_ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of VAPID_ENV_KEYS) {
    const value = savedEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  savedEnv.clear();
});

describe("formatDateStringInSaoPaulo", () => {
  it("usa o dia de São Paulo antes da meia-noite UTC", () => {
    // 01:30 UTC = 22:30 do dia anterior em São Paulo (UTC-3)
    expect(formatDateStringInSaoPaulo(new Date("2026-11-18T01:30:00Z"))).toBe(
      "2026-11-17",
    );
  });

  it("vira o dia na meia-noite de São Paulo", () => {
    // 03:00 UTC = 00:00 em São Paulo
    expect(formatDateStringInSaoPaulo(new Date("2026-11-18T03:00:00Z"))).toBe(
      "2026-11-18",
    );
  });

  it("getTodayDateString delega para o fuso de São Paulo", () => {
    expect(getTodayDateString(new Date("2026-11-18T02:59:59Z"))).toBe(
      "2026-11-17",
    );
    expect(getTodayDateString(new Date("2026-11-18T03:00:00Z"))).toBe(
      "2026-11-18",
    );
  });
});

describe("getVapidConfig / isVapidConfigured", () => {
  it("não usa chaves hardcoded quando as variáveis estão ausentes", () => {
    const config = getVapidConfig();

    expect(config).toEqual({
      publicKey: "",
      privateKey: "",
      subject: "mailto:suporte@openministry.app",
    });
    expect(isVapidConfigured()).toBe(false);
  });

  it("lê e higieniza as variáveis de ambiente", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "  public-key  ";
    process.env.VAPID_PRIVATE_KEY = "  private-key  ";
    process.env.VAPID_SUBJECT = "  mailto:ops@example.test  ";

    expect(getVapidConfig()).toEqual({
      publicKey: "public-key",
      privateKey: "private-key",
      subject: "mailto:ops@example.test",
    });
    expect(isVapidConfigured()).toBe(true);
  });

  it("exige as duas chaves para considerar o VAPID configurado", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    expect(isVapidConfigured()).toBe(false);

    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.VAPID_PRIVATE_KEY = "private-key";
    expect(isVapidConfigured()).toBe(false);

    expect(
      isVapidConfigured({
        publicKey: "public-key",
        privateKey: "",
        subject: "mailto:suporte@openministry.app",
      }),
    ).toBe(false);
    expect(
      isVapidConfigured({
        publicKey: "",
        privateKey: "private-key",
        subject: "mailto:suporte@openministry.app",
      }),
    ).toBe(false);
  });
});

describe("POST /api/jobs/felicitometro-prompt", () => {
  const routeEnvKeys = [
    "NODE_ENV",
    "CRON_SECRET",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
  ] as const;
  const savedRouteEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of routeEnvKeys) {
      savedRouteEnv.set(key, process.env[key]);
    }
  });

  afterEach(() => {
    for (const key of routeEnvKeys) {
      const value = savedRouteEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        (process.env as Record<string, string>)[key] = value;
      }
    }
    savedRouteEnv.clear();
  });

  it("falha fechado com 401 em produção sem assinatura", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    delete process.env.CRON_SECRET;
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;

    const res = await POST(
      new Request("https://app.test/api/jobs/felicitometro-prompt", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Não autorizado" });
  });

  it("GET responde 405 porque o job só aceita POST assinado", async () => {
    const res = await GET();

    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "Método não permitido" });
  });
});

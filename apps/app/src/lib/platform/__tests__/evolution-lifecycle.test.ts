import { afterAll, beforeEach, describe, expect, it } from "bun:test";

const originalFetch = globalThis.fetch;
type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];
let responder: (url: string, init?: RequestInit) => Promise<Response>;

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  calls.push({ url, init });
  return responder(url, init);
}) as typeof fetch;

beforeEach(() => {
  calls = [];
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

const {
  parseEvolutionApiUrl,
  checkEvolutionPlatformHealth,
  createEvolutionInstance,
  connectEvolutionInstance,
  getEvolutionInstanceStatus,
  disconnectEvolutionInstance,
  deleteEvolutionInstance,
} = await import("@/lib/evolution-api");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const BASE = {
  apiUrl: "https://evo.example.com/",
  globalApiKey: "global-secret",
  instanceName: "igreja-1",
};

describe("parseEvolutionApiUrl", () => {
  it("aceita http/https e remove barras", () => {
    expect(parseEvolutionApiUrl("https://evo.example.com/")).toBe(
      "https://evo.example.com",
    );
    expect(parseEvolutionApiUrl("http://localhost:8080")).toBe(
      "http://localhost:8080",
    );
  });

  it("rejeita protocolos e valores inválidos", () => {
    expect(parseEvolutionApiUrl("javascript:alert(1)")).toBeNull();
    expect(parseEvolutionApiUrl("ftp://evo.example.com")).toBeNull();
    expect(parseEvolutionApiUrl("not a url")).toBeNull();
  });
});

describe("ciclo de vida Evolution Go", () => {
  it("checa saúde e conta instâncias", async () => {
    responder = async () => json({ data: [{ name: "a" }, { name: "b" }] });
    const result = await checkEvolutionPlatformHealth(BASE);
    expect(result.ok).toBe(true);
    expect(result.instanceCount).toBe(2);
    expect(result.latencyMs).not.toBeNull();
    expect(calls[0].url).toBe("https://evo.example.com/instance/all");
  });

  it("health reporta erro legível sem vazar segredos", async () => {
    responder = async () => json({}, 401);
    const result = await checkEvolutionPlatformHealth(BASE);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("global-secret");
    expect(result.status).toBe("http_401");
  });

  it("cria instância e extrai token", async () => {
    responder = async () => json({ token: "instance-token" });
    const result = await createEvolutionInstance({
      ...BASE,
      webhookUrl: "https://app.test/api/webhooks/evolution?token=abc",
    });
    expect(result.ok).toBe(true);
    expect(result.instanceToken).toBe("instance-token");
    expect(calls[0].init?.method).toBe("POST");
  });

  it("conecta e retorna QR Code", async () => {
    responder = async () => json({ base64: "QRBASE64" });
    const result = await connectEvolutionInstance({
      ...BASE,
      instanceToken: "instance-token",
      webhookUrl: "https://app.test/hook",
    });
    expect(result.ok).toBe(true);
    expect(result.qrCode).toBe("QRBASE64");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.apikey).toBe("instance-token");
  });

  it("retorna status conectado com telefone", async () => {
    responder = async () =>
      json({ data: { Connected: true, state: "open", jid: "5511999999999@s.whatsapp.net", name: "Igreja PCM" } });
    const result = await getEvolutionInstanceStatus({
      ...BASE,
      instanceToken: "instance-token",
    });
    expect(result.connected).toBe(true);
    expect(result.phone).toBe("5511999999999@s.whatsapp.net");
    expect(result.profileName).toBe("Igreja PCM");
  });

  it("desconecta e exclui instância", async () => {
    responder = async () => json({ ok: true });
    const disconnected = await disconnectEvolutionInstance({
      ...BASE,
      instanceToken: "instance-token",
    });
    const deleted = await deleteEvolutionInstance({
      ...BASE,
      instanceToken: "instance-token",
    });
    expect(disconnected.ok).toBe(true);
    expect(deleted.ok).toBe(true);
    expect(calls[0].url).toContain("/instance/logout");
    expect(calls[1].url).toContain("/instance/delete/igreja-1");
  });
});

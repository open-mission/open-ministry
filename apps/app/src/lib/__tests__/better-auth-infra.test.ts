import { describe, expect, it } from "bun:test";

const {
  normalizeIdentifyUrl,
  normalizeKvBaseUrl,
  resolveClientIdentifyUrl,
  resolveServerKvUrl,
} = await import("@/lib/better-auth-infra");

describe("normalizeKvBaseUrl", () => {
  it("remove o sufixo /api/v1/projects/<id> do pathname", () => {
    expect(
      normalizeKvBaseUrl(
        "https://kv.better-auth.com/api/v1/projects/proj_123",
      ),
    ).toBe("https://kv.better-auth.com");
  });

  it("remove o sufixo /api/v1 do pathname", () => {
    expect(normalizeKvBaseUrl("https://kv.better-auth.com/api/v1")).toBe(
      "https://kv.better-auth.com",
    );
  });

  it("preserva subpath de proxy antes de /api/v1", () => {
    expect(
      normalizeKvBaseUrl(
        "https://proxy.example.com/better-auth/api/v1/projects/proj_123",
      ),
    ).toBe("https://proxy.example.com/better-auth");
  });

  it("remove barras finais", () => {
    expect(normalizeKvBaseUrl("https://kv.better-auth.com///")).toBe(
      "https://kv.better-auth.com",
    );
    expect(
      normalizeKvBaseUrl(
        "https://kv.better-auth.com/api/v1/projects/proj_123///",
      ),
    ).toBe("https://kv.better-auth.com");
  });

  it("aceita origin-only com espaços ao redor", () => {
    expect(normalizeKvBaseUrl("  https://kv.better-auth.com  ")).toBe(
      "https://kv.better-auth.com",
    );
  });

  it("aceita http (ex.: KV local em desenvolvimento)", () => {
    expect(normalizeKvBaseUrl("http://localhost:8787/api/v1")).toBe(
      "http://localhost:8787",
    );
  });

  it("retorna undefined para valores vazios ou inválidos", () => {
    expect(normalizeKvBaseUrl(undefined)).toBeUndefined();
    expect(normalizeKvBaseUrl(null)).toBeUndefined();
    expect(normalizeKvBaseUrl("")).toBeUndefined();
    expect(normalizeKvBaseUrl("   ")).toBeUndefined();
    expect(normalizeKvBaseUrl("not a url")).toBeUndefined();
    expect(normalizeKvBaseUrl("ftp://kv.better-auth.com")).toBeUndefined();
  });
});

describe("normalizeIdentifyUrl", () => {
  it("mantém a URL de projeto do Dash intacta", () => {
    expect(
      normalizeIdentifyUrl(
        "https://kv.better-auth.com/api/v1/projects/proj_123",
      ),
    ).toBe("https://kv.better-auth.com/api/v1/projects/proj_123");
  });

  it("converte origin-only para /api/v1", () => {
    expect(normalizeIdentifyUrl("https://kv.better-auth.com")).toBe(
      "https://kv.better-auth.com/api/v1",
    );
    expect(normalizeIdentifyUrl("https://kv.better-auth.com/")).toBe(
      "https://kv.better-auth.com/api/v1",
    );
  });

  it("remove barras finais do pathname", () => {
    expect(
      normalizeIdentifyUrl(
        "https://kv.better-auth.com/api/v1/projects/proj_123/",
      ),
    ).toBe("https://kv.better-auth.com/api/v1/projects/proj_123");
    expect(normalizeIdentifyUrl("https://kv.better-auth.com/api/v1///")).toBe(
      "https://kv.better-auth.com/api/v1",
    );
  });

  it("preserva subpath de proxy", () => {
    expect(
      normalizeIdentifyUrl(
        "https://proxy.example.com/better-auth/api/v1/projects/proj_123",
      ),
    ).toBe("https://proxy.example.com/better-auth/api/v1/projects/proj_123");
  });

  it("aceita http fora de produção", () => {
    expect(normalizeIdentifyUrl("http://localhost:8787")).toBe(
      "http://localhost:8787/api/v1",
    );
  });

  it("retorna undefined para valores vazios ou inválidos", () => {
    expect(normalizeIdentifyUrl(undefined)).toBeUndefined();
    expect(normalizeIdentifyUrl(null)).toBeUndefined();
    expect(normalizeIdentifyUrl("")).toBeUndefined();
    expect(normalizeIdentifyUrl("   ")).toBeUndefined();
    expect(normalizeIdentifyUrl("not a url")).toBeUndefined();
    expect(normalizeIdentifyUrl("ftp://kv.better-auth.com")).toBeUndefined();
  });
});

describe("resolveServerKvUrl", () => {
  it("prioriza BETTER_AUTH_KV_URL", () => {
    expect(
      resolveServerKvUrl({
        BETTER_AUTH_KV_URL: "https://kv.better-auth.com",
        NEXT_PUBLIC_BETTER_AUTH_KV_URL: "https://public.example.com",
        BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://kv.better-auth.com");
  });

  it("usa NEXT_PUBLIC_BETTER_AUTH_KV_URL quando o KV privado não existe", () => {
    expect(
      resolveServerKvUrl({
        NEXT_PUBLIC_BETTER_AUTH_KV_URL:
          "https://public.example.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://public.example.com");
  });

  it("deriva a base do servidor a partir de BETTER_AUTH_IDENTIFY_URL", () => {
    expect(
      resolveServerKvUrl({
        BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://kv.better-auth.com");
  });

  it("usa NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL como último recurso", () => {
    expect(
      resolveServerKvUrl({
        NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://kv.better-auth.com");
  });

  it("ignora valores inválidos e segue para o próximo candidato", () => {
    expect(
      resolveServerKvUrl({
        BETTER_AUTH_KV_URL: "ftp://kv.better-auth.com",
        NEXT_PUBLIC_BETTER_AUTH_KV_URL: "",
        BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://kv.better-auth.com");
  });

  it("retorna undefined quando nada está configurado", () => {
    expect(resolveServerKvUrl({})).toBeUndefined();
  });
});

describe("resolveClientIdentifyUrl", () => {
  it("prioriza NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL", () => {
    expect(
      resolveClientIdentifyUrl({
        NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/public",
        BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/private",
      }),
    ).toBe("https://kv.better-auth.com/api/v1/projects/public");
  });

  it("usa BETTER_AUTH_IDENTIFY_URL como fallback", () => {
    expect(
      resolveClientIdentifyUrl({
        BETTER_AUTH_IDENTIFY_URL:
          "https://kv.better-auth.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://kv.better-auth.com/api/v1/projects/proj_123");
  });

  it("converte NEXT_PUBLIC_BETTER_AUTH_KV_URL origin-only para /api/v1", () => {
    expect(
      resolveClientIdentifyUrl({
        NEXT_PUBLIC_BETTER_AUTH_KV_URL: "https://kv.better-auth.com",
      }),
    ).toBe("https://kv.better-auth.com/api/v1");
  });

  it("usa BETTER_AUTH_KV_URL como último recurso", () => {
    expect(
      resolveClientIdentifyUrl({
        BETTER_AUTH_KV_URL: "https://kv.better-auth.com/api/v1",
      }),
    ).toBe("https://kv.better-auth.com/api/v1");
  });

  it("ignora valores inválidos e segue para o próximo candidato", () => {
    expect(
      resolveClientIdentifyUrl({
        NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL: "not a url",
        BETTER_AUTH_IDENTIFY_URL: "",
        NEXT_PUBLIC_BETTER_AUTH_KV_URL:
          "https://kv.better-auth.com/api/v1/projects/proj_123",
      }),
    ).toBe("https://kv.better-auth.com/api/v1/projects/proj_123");
  });

  it("retorna undefined quando nada está configurado", () => {
    expect(resolveClientIdentifyUrl({})).toBeUndefined();
  });
});

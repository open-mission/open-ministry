import { describe, expect, it } from "bun:test";

const { buildSecurityHeaders } = await import("@/lib/security-headers");

const UPLOADTHING_SOURCES = [
  "https://*.ingest.uploadthing.com",
  "https://*.uploadthing.com",
  "https://*.ufs.sh",
  "https://utfs.io",
] as const;

function getCspValue(options: Parameters<typeof buildSecurityHeaders>[0]): string {
  const [csp] = buildSecurityHeaders(options).filter(
    (h) => h.key === "Content-Security-Policy",
  );
  return csp?.value ?? "";
}

function getConnectDirective(csp: string): string {
  return (
    csp
      .split("; ")
      .find((directive) => directive.startsWith("connect-src")) ?? ""
  );
}

function expectConnectSources(csp: string, extraSources: string[] = []): void {
  const directive = getConnectDirective(csp);
  const sources = directive.replace("connect-src ", "").split(" ");

  expect(sources).toContain("'self'");
  for (const source of UPLOADTHING_SOURCES) {
    expect(sources).toContain(source);
  }
  for (const extra of extraSources) {
    expect(sources).toContain(extra);
  }
  // Sem curinga genérico: connect-src não deve liberar todo o https.
  expect(sources).not.toContain("https:");
}

describe("buildSecurityHeaders", () => {
  it("CSP restritivo em produção, sem unsafe-eval", () => {
    const [csp] = buildSecurityHeaders({
      nodeEnv: "production",
    }).filter((h) => h.key === "Content-Security-Policy");
    const value = csp?.value ?? "";

    expect(value).toContain("default-src 'self'");
    expect(value).toContain("script-src 'self' 'unsafe-inline'");
    expect(value).not.toContain("unsafe-eval");
    expect(value).toContain("frame-ancestors 'none'");
    expect(value).toContain("object-src 'none'");
    expect(value).toContain("base-uri 'self'");
    expect(value).toContain("form-action 'self'");
  });

  it("dev libera unsafe-eval para HMR do Turbopack", () => {
    const [csp] = buildSecurityHeaders({
      nodeEnv: "development",
    }).filter((h) => h.key === "Content-Security-Policy");

    expect(csp?.value).toContain("unsafe-eval");
  });

  it("inclui o origin do realtime no connect-src quando configurado", () => {
    const value = getCspValue({
      nodeEnv: "production",
      realtimeUrl: "wss://ep-cool-darkness-a1b2.neon-realtime.tech",
    });

    expectConnectSources(value, [
      "wss://ep-cool-darkness-a1b2.neon-realtime.tech",
    ]);
    expect(getConnectDirective(value)).toBe(
      `connect-src 'self' ${UPLOADTHING_SOURCES.join(" ")} wss://ep-cool-darkness-a1b2.neon-realtime.tech`,
    );
  });

  it("sem realtime, connect-src mantém self e os domínios do UploadThing", () => {
    const value = getCspValue({
      nodeEnv: "production",
    });

    expectConnectSources(value);
    expect(getConnectDirective(value)).toBe(
      `connect-src 'self' ${UPLOADTHING_SOURCES.join(" ")}`,
    );
  });

  it("inclui o origin do Sentinel no connect-src quando configurado", () => {
    const value = getCspValue({
      nodeEnv: "production",
      sentinelUrl: "https://kv.better-auth.com/identify",
    });

    expectConnectSources(value, ["https://kv.better-auth.com"]);
    expect(getConnectDirective(value)).toBe(
      `connect-src 'self' ${UPLOADTHING_SOURCES.join(" ")} https://kv.better-auth.com`,
    );
  });

  it("não duplica origins repetidos no connect-src", () => {
    const value = getCspValue({
      nodeEnv: "production",
      realtimeUrl: "https://kv.better-auth.com/ws",
      sentinelUrl: "https://kv.better-auth.com/identify",
    });

    expect(getConnectDirective(value)).toBe(
      `connect-src 'self' ${UPLOADTHING_SOURCES.join(" ")} https://kv.better-auth.com`,
    );
  });

  it("aceita Sentinel em http apenas fora de produção", () => {
    const devCsp = getCspValue({
      nodeEnv: "development",
      sentinelUrl: "http://localhost:8787",
    });
    expect(devCsp).toContain("http://localhost:8787");

    const prodCsp = getCspValue({
      nodeEnv: "production",
      sentinelUrl: "http://localhost:8787",
    });
    expect(prodCsp).not.toContain("http://localhost:8787");
  });

  it("ignora sentinelUrl inválido sem quebrar a CSP", () => {
    const value = getCspValue({
      nodeEnv: "production",
      sentinelUrl: "not a url",
    });

    expectConnectSources(value);
    expect(getConnectDirective(value)).toBe(
      `connect-src 'self' ${UPLOADTHING_SOURCES.join(" ")}`,
    );
  });

  it("libera blob: no worker-src para o worker do Sentry Replay", () => {
    const value = getCspValue({ nodeEnv: "production" });
    const directive =
      value.split("; ").find((item) => item.startsWith("worker-src")) ?? "";

    expect(directive).toBe("worker-src 'self' blob:");
    expect(value).not.toContain("worker-src 'self';");
  });

  it("emite os headers de segurança clássicos", () => {
    const headers = buildSecurityHeaders({ nodeEnv: "production" });
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
    expect(byKey["Strict-Transport-Security"]).toContain("max-age=");
  });
});

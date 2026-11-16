import { describe, expect, it } from "bun:test";

const { buildSecurityHeaders } = await import("@/lib/security-headers");

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
    const [csp] = buildSecurityHeaders({
      nodeEnv: "production",
      realtimeUrl: "wss://ep-cool-darkness-a1b2.neon-realtime.tech",
    }).filter((h) => h.key === "Content-Security-Policy");

    expect(csp?.value).toContain("connect-src 'self' wss://ep-cool-darkness-a1b2.neon-realtime.tech");
  });

  it("sem realtime, connect-src fica só no self", () => {
    const [csp] = buildSecurityHeaders({
      nodeEnv: "production",
    }).filter((h) => h.key === "Content-Security-Policy");

    expect(csp?.value).toContain("connect-src 'self';");
  });

  it("inclui o origin do Sentinel no connect-src quando configurado", () => {
    const [csp] = buildSecurityHeaders({
      nodeEnv: "production",
      sentinelUrl: "https://kv.better-auth.com/identify",
    }).filter((h) => h.key === "Content-Security-Policy");

    expect(csp?.value).toContain(
      "connect-src 'self' https://kv.better-auth.com;",
    );
  });

  it("não duplica origins repetidos no connect-src", () => {
    const [csp] = buildSecurityHeaders({
      nodeEnv: "production",
      realtimeUrl: "https://kv.better-auth.com/ws",
      sentinelUrl: "https://kv.better-auth.com/identify",
    }).filter((h) => h.key === "Content-Security-Policy");
    const value = csp?.value ?? "";
    const connectDirective = value
      .split("; ")
      .find((directive) => directive.startsWith("connect-src"));

    expect(connectDirective).toBe("connect-src 'self' https://kv.better-auth.com");
  });

  it("aceita Sentinel em http apenas fora de produção", () => {
    const [devCsp] = buildSecurityHeaders({
      nodeEnv: "development",
      sentinelUrl: "http://localhost:8787",
    }).filter((h) => h.key === "Content-Security-Policy");
    expect(devCsp?.value).toContain("http://localhost:8787");

    const [prodCsp] = buildSecurityHeaders({
      nodeEnv: "production",
      sentinelUrl: "http://localhost:8787",
    }).filter((h) => h.key === "Content-Security-Policy");
    expect(prodCsp?.value).not.toContain("http://localhost:8787");
  });

  it("ignora sentinelUrl inválido sem quebrar a CSP", () => {
    const [csp] = buildSecurityHeaders({
      nodeEnv: "production",
      sentinelUrl: "not a url",
    }).filter((h) => h.key === "Content-Security-Policy");

    expect(csp?.value).toContain("connect-src 'self';");
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

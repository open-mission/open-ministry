import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "bun:test";

/**
 * Guarda de regressão estática: o cache L2 (Upstash) serializa com JSON.stringify
 * tudo que entra em `remember`. Um teste com módulos mockados é frágil aqui porque
 * os mocks de `@/lib/cache` vazam entre arquivos no mesmo processo Bun.
 */
const root = path.resolve(import.meta.dir, "../../../../../..");

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("cache L2 sem segredos descriptografados", () => {
  it("evolution-config guarda só o segredo cifrado e descriptografa fora do remember", () => {
    const code = source("apps/app/src/lib/platform/evolution-config.ts");
    expect(code).toContain("platform:evolution:config:v2");
    expect(code).toContain("encryptedSecrets: integration.encryptedSecrets");

    const rememberStart = code.indexOf("remember<");
    const decryptOutside = code.indexOf("decryptSecret(cached.encryptedSecrets)");
    expect(rememberStart).toBeGreaterThan(-1);
    expect(decryptOutside).toBeGreaterThan(rememberStart);
    expect(code).not.toContain("globalApiKey: decryptSecret");
  });

  it("notification-service guarda só o instanceToken cifrado", () => {
    const code = source("apps/app/src/lib/notification-service.ts");
    expect(code).toContain("org:${organizationId}:evolution-config:v2");
    expect(code).toContain("encryptedSecret: channel.instanceToken");

    const rememberStart = code.indexOf("remember<CachedEvolutionConfig>");
    const decryptOutside = code.indexOf("decryptSecret(cached.encryptedSecret)");
    expect(rememberStart).toBeGreaterThan(-1);
    expect(decryptOutside).toBeGreaterThan(rememberStart);
    expect(code).not.toContain("apiKey: decryptSecret");
  });
});

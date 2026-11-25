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
  it("integrations-config guarda só o segredo cifrado e resolve env fora do remember", () => {
    const code = source("apps/app/src/lib/platform/integrations-config.ts");
    expect(code).toContain("platform:integration:${provider}:v2");
    expect(code).toContain("encryptedSecrets: row.encryptedSecrets");

    const fetcherStart = code.indexOf("getCachedPlatformIntegration");
    const fetcherBodyIndex = code.indexOf("db.query.platformIntegrationConfig.findFirst", fetcherStart);
    const rememberEnd = code.indexOf('"platform:integrations"', fetcherStart);
    const fetcherBody = code.slice(fetcherStart, rememberEnd);
    expect(fetcherBody).not.toContain("process.env");
    expect(fetcherBody).not.toContain("decryptSecret");
    expect(fetcherBody).not.toContain("JSON.stringify");

    const envReaders = code.indexOf("function readEnv");
    const decryptReader = code.indexOf("export function parseEncryptedSecrets");
    expect(fetcherStart).toBeGreaterThan(-1);
    expect(fetcherBodyIndex).toBeGreaterThan(fetcherStart);
    expect(rememberEnd).toBeGreaterThan(fetcherBodyIndex);
    // Leitura de env e descriptografia são helpers separados, fora do fetcher.
    expect(envReaders).toBeGreaterThan(-1);
    expect(decryptReader).toBeGreaterThan(-1);
  });

  it("evolution-config permanece compatível reexportando o resolvedor", () => {
    const code = source("apps/app/src/lib/platform/evolution-config.ts");
    expect(code).toContain('from "@/lib/platform/integrations-config"');
    expect(code).toContain("getPlatformEvolutionConfig");
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

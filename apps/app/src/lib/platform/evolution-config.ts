import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { decryptSecret } from "@/lib/secret-crypto";
import { remember } from "@/lib/cache";

export type PlatformEvolutionConfig = {
  apiUrl: string;
  globalApiKey: string;
  provider: string;
};

type CachedPlatformEvolutionConfig = {
  apiUrl: string;
  encryptedSecrets: string;
  provider: string;
};

/**
 * Configuração global da Evolution usada apenas no servidor.
 * O cache L2 guarda SOMENTE o segredo ainda cifrado; a descriptografia acontece
 * fora do remember(), apenas em memória, no momento do uso.
 */
export async function getPlatformEvolutionConfig(): Promise<PlatformEvolutionConfig | null> {
  const cached = await remember<CachedPlatformEvolutionConfig | null>(
    "platform:evolution:config:v2",
    120,
    async () => {
      const integration = await db.query.platformIntegrationConfig.findFirst({
        where: eq(schema.platformIntegrationConfig.provider, "evolution_whatsapp"),
      });
      if (!integration?.isEnabled) return null;

      const config = integration.configJson as { apiUrl?: unknown } | null;
      const apiUrl = typeof config?.apiUrl === "string" ? config.apiUrl.trim() : "";
      if (!apiUrl || !integration.encryptedSecrets) return null;

      return {
        apiUrl,
        encryptedSecrets: integration.encryptedSecrets,
        provider: integration.provider,
      };
    },
    ["platform:integrations"],
  );

  if (!cached) return null;
  const globalApiKey = decryptSecret(cached.encryptedSecrets);
  if (!globalApiKey) return null;

  return {
    apiUrl: cached.apiUrl,
    globalApiKey,
    provider: cached.provider,
  };
}

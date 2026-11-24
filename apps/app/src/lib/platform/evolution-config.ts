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

/**
 * Configuração global decrypted da Evolution usada apenas no servidor.
 * Nunca deve ser devolvida por Server Actions para o navegador.
 */
export async function getPlatformEvolutionConfig(): Promise<PlatformEvolutionConfig | null> {
  return remember(
    "platform:evolution:config",
    120,
    async () => {
      const integration = await db.query.platformIntegrationConfig.findFirst({
        where: eq(schema.platformIntegrationConfig.provider, "evolution_whatsapp"),
      });
      if (!integration?.isEnabled) return null;

      const config = integration.configJson as { apiUrl?: unknown } | null;
      const apiUrl = typeof config?.apiUrl === "string" ? config.apiUrl.trim() : "";
      const globalApiKey = decryptSecret(integration.encryptedSecrets);
      if (!apiUrl || !globalApiKey) return null;

      return { apiUrl, globalApiKey, provider: integration.provider };
    },
    ["platform:integrations"],
  );
}

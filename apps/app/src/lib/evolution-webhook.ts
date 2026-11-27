import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Autenticação do webhook de status da Evolution API.
 *
 * O token é o `webhookSecret` do canal configurado pela igreja e identifica a
 * organização. A apiKey da Evolution não é aceita como token: fica cifrada em
 * repouso e não é mais chave de busca. Em produção, requests sem token válido
 * são rejeitados; fora de produção, mantém-se o comportamento anterior (token
 * opcional) para facilitar o desenvolvimento local.
 *
 * A comparação usa digests SHA-256 de tamanho fixo + timingSafeEqual, para não
 * vazar o segredo por diferença de tempo de resposta.
 */
export type EvolutionWebhookAuth =
  | {
      ok: true;
      organizationId: string | null;
      channelId: string | null;
      instanceName: string | null;
    }
  | { ok: false };

export type EvolutionChannelLookup = (
  token: string,
) => Promise<{
  id?: string;
  organizationId: string;
  webhookSecret?: string | null;
  instanceName?: string | null;
} | null>;

function secretsEqual(provided: string, stored: string): boolean {
  const providedHash = createHash("sha256").update(provided, "utf8").digest();
  const storedHash = createHash("sha256").update(stored, "utf8").digest();
  return timingSafeEqual(providedHash, storedHash);
}

export async function authenticateEvolutionWebhook(
  token: string | null | undefined,
  findChannelByToken: EvolutionChannelLookup,
  environment: string = process.env.NODE_ENV ?? "development",
): Promise<EvolutionWebhookAuth> {
  const noChannel = {
    ok: true as const,
    organizationId: null,
    channelId: null,
    instanceName: null,
  };

  if (!token) {
    if (environment !== "production") {
      return noChannel;
    }
    return { ok: false };
  }

  const channel = await findChannelByToken(token);

  if (
    !channel ||
    !channel.webhookSecret ||
    !secretsEqual(token, channel.webhookSecret)
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    organizationId: channel.organizationId,
    channelId: channel.id ?? null,
    instanceName: channel.instanceName ?? null,
  };
}

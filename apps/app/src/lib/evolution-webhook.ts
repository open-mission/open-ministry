/**
 * Autenticação do webhook de status da Evolution API.
 *
 * O token é o `webhookSecret` do canal configurado pela igreja e identifica a
 * organização. A apiKey da Evolution não é aceita como token: fica cifrada em
 * repouso e não é mais chave de busca. Em produção, requests sem token válido
 * são rejeitados; fora de produção, mantém-se o comportamento anterior (token
 * opcional) para facilitar o desenvolvimento local.
 */
export type EvolutionWebhookAuth =
  | { ok: true; organizationId: string | null }
  | { ok: false };

export type EvolutionChannelLookup = (
  token: string,
) => Promise<{ organizationId: string } | null>;

export async function authenticateEvolutionWebhook(
  token: string | null | undefined,
  findChannelByToken: EvolutionChannelLookup,
  environment: string = process.env.NODE_ENV ?? "development",
): Promise<EvolutionWebhookAuth> {
  if (!token) {
    if (environment !== "production") {
      return { ok: true, organizationId: null };
    }
    return { ok: false };
  }

  const channel = await findChannelByToken(token);

  if (!channel) {
    return { ok: false };
  }

  return { ok: true, organizationId: channel.organizationId };
}

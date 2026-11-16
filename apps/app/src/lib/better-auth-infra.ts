/**
 * Normalização das URLs do Better Auth Infra (Dash + Sentinel).
 *
 * O Dash fornece uma única URL de identify no formato
 * `https://kv.better-auth.com/api/v1/projects/<id>`:
 *
 * - O cliente (`sentinelClient({ identifyUrl })`) faz POST em
 *   `<identifyUrl>/identify`, então precisa do path do projeto.
 * - O servidor (`dash`/`sentinel`) faz GET em `<kvUrl>/api/v1/identify/:id`
 *   e POST em `<kvUrl>/api/v1/email/validate`, então `kvUrl` precisa ser a
 *   base sem `/api/v1` nem `/api/v1/projects/<id>`.
 *
 * Este módulo não importa `server-only` de propósito: é usado pelo
 * `next.config.ts`, pelo servidor (`auth.ts`), pelo cliente
 * (`auth-client.ts`) e pelos testes.
 */
export type BetterAuthInfraEnv = {
  BETTER_AUTH_API_KEY?: string;
  BETTER_AUTH_IDENTIFY_URL?: string;
  NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL?: string;
  BETTER_AUTH_KV_URL?: string;
  NEXT_PUBLIC_BETTER_AUTH_KV_URL?: string;
};

function parseHttpUrl(value?: string | null): URL | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

function stripTrailingSlashes(pathname: string): string {
  return pathname.replace(/\/+$/, "");
}

/**
 * Base do KV usada pelo servidor: remove `/api/v1` e
 * `/api/v1/projects/<id>` do final do pathname, preservando subpaths de
 * proxy.
 */
export function normalizeKvBaseUrl(
  value?: string | null,
): string | undefined {
  const url = parseHttpUrl(value);
  if (!url) return undefined;

  const withoutApiSuffix = stripTrailingSlashes(url.pathname).replace(
    /\/api\/v1(?:\/projects\/[^/]+)?$/,
    "",
  );

  return `${url.origin}${stripTrailingSlashes(withoutApiSuffix)}`;
}

/**
 * URL de identify usada pelo cliente: preserva o path do projeto. Quando só
 * a origem é informada, assume a convenção `/api/v1` do `@better-auth/infra`
 * (POST `<identifyUrl>/identify`).
 */
export function normalizeIdentifyUrl(
  value?: string | null,
): string | undefined {
  const url = parseHttpUrl(value);
  if (!url) return undefined;

  const pathname = stripTrailingSlashes(url.pathname);
  if (pathname === "" || pathname === "/") {
    return `${url.origin}/api/v1`;
  }

  return `${url.origin}${pathname}`;
}

/**
 * Base do KV no servidor. Precedência: URL explícita do KV (privada e
 * pública) e depois a URL de identify, derivando a base.
 */
export function resolveServerKvUrl(
  env: BetterAuthInfraEnv,
): string | undefined {
  const candidates = [
    env.BETTER_AUTH_KV_URL,
    env.NEXT_PUBLIC_BETTER_AUTH_KV_URL,
    env.BETTER_AUTH_IDENTIFY_URL,
    env.NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeKvBaseUrl(candidate);
    if (normalized) return normalized;
  }

  return undefined;
}

/**
 * URL de identify no cliente. Prefere as variáveis públicas (inlinadas pelo
 * Next no bundle) e cai para as privadas quando expostas explicitamente.
 */
export function resolveClientIdentifyUrl(
  env: BetterAuthInfraEnv,
): string | undefined {
  const candidates = [
    env.NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL,
    env.BETTER_AUTH_IDENTIFY_URL,
    env.NEXT_PUBLIC_BETTER_AUTH_KV_URL,
    env.BETTER_AUTH_KV_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIdentifyUrl(candidate);
    if (normalized) return normalized;
  }

  return undefined;
}

import { neonConfig } from "@neondatabase/serverless";

/**
 * Configuração condicional do driver serverless do Neon para o Neon Local.
 *
 * Em produção nada é alterado: o driver continua usando os endpoints padrão do
 * Neon (HTTPS + WebSocket). Só entramos no modo local quando `NEON_LOCAL` está
 * explicitamente ativo ou quando a connection string aponta para um host local.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "db"]);
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function firstConnectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_AUTHENTICATED_URL ||
    ""
  );
}

function hasLocalHost(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isNeonLocal(): boolean {
  const flag = process.env.NEON_LOCAL?.trim().toLowerCase();

  if (flag && TRUE_VALUES.has(flag)) return true;
  if (flag && FALSE_VALUES.has(flag)) return false;

  return hasLocalHost(firstConnectionString());
}

/** Endpoint HTTP do proxy Neon Local (sobrescrevível para rodar dentro do compose). */
export function neonLocalFetchEndpoint(): string {
  return process.env.NEON_LOCAL_SQL_ENDPOINT || "http://localhost:5432/sql";
}

let lastApplied: string | null = null;

/**
 * Aplica (no máximo uma vez por configuração) as opções HTTP exigidas pelo
 * Neon Local. Retorna `true` quando o modo local está ativo.
 */
export function configureNeonLocal(): boolean {
  if (!isNeonLocal()) {
    // Evita o cenário silencioso: NEON_LOCAL ligado, mas o processo recebeu
    // uma connection string remota (ex.: `apps/app/.env` antigo), rodando as
    // migrations no banco local e o app no banco da nuvem.
    const flag = process.env.NEON_LOCAL?.trim().toLowerCase();
    if (
      flag &&
      TRUE_VALUES.has(flag) &&
      firstConnectionString() &&
      !hasLocalHost(firstConnectionString())
    ) {
      console.warn(
        "[db] NEON_LOCAL=true, mas DATABASE_URL não aponta para localhost. Rode `bun run setup:local`.",
      );
    }
    return false;
  }

  const endpoint = neonLocalFetchEndpoint();
  if (lastApplied === endpoint) return true;

  neonConfig.fetchEndpoint = endpoint;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
  lastApplied = endpoint;

  return true;
}

/**
 * O drizzle-kit usa o driver `pg`, que não aceita `ssl` junto de `url`. O Neon
 * Local usa certificado self-signed; `sslmode=no-verify` é a forma documentada
 * de aceitá-lo sem tocar na URL de produção.
 */
export function drizzleKitUrl(): string {
  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_AUTHENTICATED_URL ||
    "";

  if (!url || !hasLocalHost(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("sslmode", "no-verify");
    return parsed.toString();
  } catch {
    return url;
  }
}

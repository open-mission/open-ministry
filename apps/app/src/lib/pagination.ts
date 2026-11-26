/**
 * Limites seguros compartilhados entre libraries e rotas de API.
 *
 * Nada aqui confia em valores vindos da URL: strings inválidas caem no default,
 * decimais são truncados e intervalos são sempre limitados por um teto. Isso
 * evita que uma consulta sem limite (ou com limite absurdo) carregue o banco.
 */
export type PaginationOptions = { limit?: number; offset?: number };

const MAX_OFFSET = 100_000;

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampPageLimit(
  value: number | string | null | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

export function clampOffset(
  value: number | string | null | undefined,
): number {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), MAX_OFFSET);
}

export function readPaginationParams(
  searchParams: URLSearchParams,
  fallbackLimit: number,
  maxLimit: number,
): PaginationOptions {
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");
  return {
    limit: clampPageLimit(rawLimit, fallbackLimit, maxLimit),
    offset: clampOffset(rawOffset),
  };
}

/** Keeps cache keys of default (legacy) calls unchanged. */
export function paginationCacheSuffix(
  limit: number,
  offset: number,
  defaultLimit: number,
): string {
  if (limit === defaultLimit && offset === 0) return "";
  return `:${limit}:${offset}`;
}

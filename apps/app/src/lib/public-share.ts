import "server-only";

import { randomBytes } from "node:crypto";

/**
 * Tokens de compartilhamento público de cronograma (achado 8).
 *
 * O token antigo era um UUID truncado a 16 hex (64 bits). Agora são 256 bits
 * base64url, e o link expira `PUBLIC_SHARE_MAX_AGE_DAYS` após a última
 * geração/atualização — mitigação para links vazados: a liderança pode
 * regenerar, e links esquecidos morrem sozinhos.
 */
export const PUBLIC_SHARE_MAX_AGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export function generatePublicShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isPublicShareExpired(
  publicShareUpdatedAt: Date | null | undefined,
): boolean {
  // Linhas legadas anteriores à coluna publicShareUpdatedAt não expiram.
  if (!publicShareUpdatedAt) {
    return false;
  }

  return (
    Date.now() - publicShareUpdatedAt.getTime() >
    PUBLIC_SHARE_MAX_AGE_DAYS * DAY_MS
  );
}

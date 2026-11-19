import { createHash, randomBytes } from "node:crypto";

/**
 * Token de assinatura de calendário. 32 bytes aleatórios em base64url (43
 * caracteres), impossível de adivinhar por força bruta.
 */
export function generateFeedToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * O banco guarda apenas o hash: um vazamento de dados não entrega links de
 * agenda ativos. Como o SHA-256 de 32 bytes aleatórios não é reversível, o
 * token bruto só existe no momento em que o link é exibido ao membro.
 */
export function hashFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const MIN_TOKEN_LENGTH = 32;

/** Corta cedo tokens obviamente inválidos (não gasta query no banco). */
export function isPlausibleFeedToken(token: string | undefined | null): boolean {
  if (!token) return false;
  if (token.length < MIN_TOKEN_LENGTH || token.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(token);
}

import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Criptografia de segredos em repouso (AES-256-GCM) para valores guardados no
 * banco, como `organizationNotificationChannel.apiKey`.
 *
 * Chave: variável de ambiente `SECRETS_ENCRYPTION_KEY` — qualquer valor não
 * vazio é aceito e normalizado com SHA-256 para 32 bytes; use uma sequência
 * aleatória longa (ex.: `openssl rand -base64 32`). Sem a variável, grava em
 * claro (fail-open, mesmo comportamento atual) — não derruba o fluxo da igreja.
 *
 * Formato cifrado: `enc:v1:<iv>:<ciphertext>:<tag>` (base64url). Valores sem o
 * prefixo são considerados legados e passam direto no decrypt — a migração
 * acontece naturalmente quando o admin re-salva as configurações.
 */
const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const secret = process.env.SECRETS_ENCRYPTION_KEY;
  if (!secret) {
    return null;
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) {
    return plain;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}:${ciphertext.toString("base64url")}:${tag.toString("base64url")}`;
}

export function decryptSecret(
  stored: string | null | undefined,
): string | null {
  if (!stored) {
    return null;
  }

  if (!stored.startsWith(PREFIX)) {
    return stored;
  }

  const key = getKey();
  if (!key) {
    // Cifrado, mas sem chave para decifrar: trata como inválido em vez de
    // devolver lixo para a Evolution API.
    return null;
  }

  try {
    const [, , ivB64, ciphertextB64, tagB64] = stored.split(":");
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

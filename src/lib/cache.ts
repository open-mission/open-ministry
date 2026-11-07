import "server-only";

import { getRedisClient, isRedisConfigured } from "@/lib/queue";

const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
    return new Date(value);
  }
  return value;
}

type MemoryEntry<T> = {
  value: T;
  expiresAt: number;
};

// L1 In-Memory Cache (0ms latency)
const memoryCache = new Map<string, MemoryEntry<unknown>>();
const tagToKeysMap = new Map<string, Set<string>>();
const MAX_MEMORY_ENTRIES = 1000;

function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Obtém valor do cache L1 (Memória) ou L2 (Upstash Redis).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();

  // 1. Tentar L1 (Memória)
  const memEntry = memoryCache.get(key) as MemoryEntry<T> | undefined;
  if (memEntry) {
    if (memEntry.expiresAt > now) {
      return memEntry.value;
    }
    memoryCache.delete(key);
  }

  // 2. Tentar L2 (Upstash Redis)
  const redis = getRedisClient();
  if (redis && isRedisConfigured()) {
    try {
      const data = await redis.get(key);
      if (data !== null && data !== undefined) {
        let parsed: T;
        if (typeof data === "string") {
          try {
            parsed = JSON.parse(data, dateReviver) as T;
          } catch {
            parsed = data as unknown as T;
          }
        } else {
          // Upstash redis auto-json parse
          parsed = JSON.parse(JSON.stringify(data), dateReviver) as T;
        }

        // Salvar de volta em L1 com TTL padrão de 30s
        memoryCache.set(key, { value: parsed, expiresAt: now + 30000 });
        return parsed;
      }
    } catch (err) {
      console.warn(`[Cache] Erro ao ler do Redis para chave "${key}":`, err);
    }
  }

  return null;
}

/**
 * Salva valor no cache L1 e L2 com TTL em segundos e tags opcionais.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  tags: string[] = [],
): Promise<void> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  // L1 Memória
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    cleanupMemoryCache();
  }
  memoryCache.set(key, { value, expiresAt });

  // Mapear tags na memória
  for (const tag of tags) {
    if (!tagToKeysMap.has(tag)) {
      tagToKeysMap.set(tag, new Set());
    }
    tagToKeysMap.get(tag)!.add(key);
  }

  // L2 Redis
  const redis = getRedisClient();
  if (redis && isRedisConfigured()) {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized, { ex: ttlSeconds });

      // Salvar tags no Redis usando sets para invalidação remota
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await redis.sadd(tagKey, key);
        await redis.expire(tagKey, Math.max(ttlSeconds * 2, 86400));
      }
    } catch (err) {
      console.warn(`[Cache] Erro ao salvar no Redis para chave "${key}":`, err);
    }
  }
}

/**
 * Invalida chaves específicas no L1 e L2.
 */
export async function cacheDelete(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  for (const key of keys) {
    memoryCache.delete(key);
  }

  const redis = getRedisClient();
  if (redis && isRedisConfigured()) {
    try {
      await redis.del(...keys);
    } catch (err) {
      console.warn("[Cache] Erro ao deletar chaves do Redis:", err);
    }
  }
}

/**
 * Invalida todas as chaves associadas a uma ou mais tags.
 */
export async function cacheInvalidateTags(...tags: string[]): Promise<void> {
  if (tags.length === 0) return;

  // Invalidação em L1
  const keysToDelete = new Set<string>();
  for (const tag of tags) {
    const keys = tagToKeysMap.get(tag);
    if (keys) {
      for (const k of keys) {
        keysToDelete.add(k);
        memoryCache.delete(k);
      }
      tagToKeysMap.delete(tag);
    }
  }

  // Invalidação em L2 Redis
  const redis = getRedisClient();
  if (redis && isRedisConfigured()) {
    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const remoteKeys = await redis.smembers(tagKey);
        if (remoteKeys && remoteKeys.length > 0) {
          await redis.del(...remoteKeys);
        }
        await redis.del(tagKey);
      }
    } catch (err) {
      console.warn("[Cache] Erro ao invalidar tags no Redis:", err);
    }
  }
}

/**
 * Executa ou recupera o resultado em cache com L1/L2 de alta velocidade.
 */
export async function remember<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  tags: string[] = [],
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const result = await fetcher();
  await cacheSet(key, result, ttlSeconds, tags);
  return result;
}

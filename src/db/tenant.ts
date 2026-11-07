import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { createLocalJWKSet, jwtVerify, type JWK } from "jose";
import { cache } from "react";
import { headers } from "next/headers";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { auth } from "@/lib/auth";
import { getSession, type AuthSession } from "@/lib/session";

const JWT_AUDIENCE = "openministry";

const globalForTenant = globalThis as unknown as {
  __tenantPool?: Pool;
};

export function isTenantDbEnabled(): boolean {
  return Boolean(process.env.DATABASE_AUTHENTICATED_URL);
}

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_AUTHENTICATED_URL;

  if (!connectionString) {
    return null;
  }

  if (!globalForTenant.__tenantPool) {
    globalForTenant.__tenantPool = new Pool({ connectionString });
  }

  return globalForTenant.__tenantPool;
}

function createTenantDb() {
  const pool = getPool();

  if (!pool) {
    return null;
  }

  return drizzle(pool, { schema });
}

export type TenantDb = NonNullable<ReturnType<typeof createTenantDb>>;
export type TenantTransaction = Parameters<
  Parameters<TenantDb["transaction"]>[0]
>[0];

let cachedJwksSet: ReturnType<typeof createLocalJWKSet> | null = null;
let jwksCachedAt = 0;
const JWKS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

async function getJwks() {
  const now = Date.now();
  if (cachedJwksSet && now - jwksCachedAt < JWKS_CACHE_TTL_MS) {
    return cachedJwksSet;
  }

  // Read the public keys from the database instead of fetching this app's own
  // /api/auth/jwks endpoint. Preview deployments are protected by Vercel
  // Authentication, so a server-to-self HTTP call would receive the SSO
  // redirect instead of the keys.
  const rows = await db
    .select({
      id: schema.jwks.id,
      publicKey: schema.jwks.publicKey,
      alg: schema.jwks.alg,
      crv: schema.jwks.crv,
    })
    .from(schema.jwks);

  const keys = rows.map((row) => ({
    ...(JSON.parse(row.publicKey) as JWK),
    kid: row.id,
    ...(row.alg ? { alg: row.alg } : {}),
    ...(row.crv ? { crv: row.crv } : {}),
  }));

  cachedJwksSet = createLocalJWKSet({ keys });
  jwksCachedAt = now;
  return cachedJwksSet;
}

const getAuthToken = cache(async (): Promise<string | null> => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const result = await auth.api.getToken({ headers: await headers() });

  return result?.token ?? null;
});

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, await getJwks(), {
    issuer: getAppBaseUrl(),
    audience: JWT_AUDIENCE,
  });

  if (!payload.sub) {
    throw new Error("JWT sem claim sub.");
  }

  return payload;
}

export async function withTenantDb<T>(
  callback: (tx: TenantTransaction, session: AuthSession) => Promise<T>,
): Promise<T | null> {
  const db = createTenantDb();

  if (!db) {
    return null;
  }

  const session = await getSession();

  if (!session) {
    return null;
  }

  const token = await getAuthToken();

  if (!token) {
    return null;
  }

  const claims = await verifyToken(token);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    );

    return callback(tx, session);
  });
}

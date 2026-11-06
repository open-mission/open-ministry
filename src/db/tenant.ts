import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cache } from "react";
import { headers } from "next/headers";

import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSession, type AuthSession } from "@/lib/session";

const JWT_AUDIENCE = "openministry";

const globalForTenant = globalThis as unknown as {
  __tenantPool?: Pool;
  __tenantJwks?: ReturnType<typeof createRemoteJWKSet>;
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

function getJwks() {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  if (!globalForTenant.__tenantJwks) {
    globalForTenant.__tenantJwks = createRemoteJWKSet(
      new URL("/api/auth/jwks", baseUrl),
    );
  }

  return globalForTenant.__tenantJwks;
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
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: process.env.BETTER_AUTH_URL,
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

import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://build-fallback:build-fallback@localhost:5432/build-fallback";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "test") {
  console.warn(
    "[db] Warning: DATABASE_URL is not set. Using build-time fallback connection string.",
  );
}

const sql = neon(connectionString);

export const db = drizzle({ client: sql, schema });
export { schema };
export * from "./schema";

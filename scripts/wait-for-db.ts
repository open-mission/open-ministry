import { config } from "dotenv";
import path from "node:path";

import { configureNeonLocal } from "@openministry/db/neon-config";

config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "apps/app/.env") });

configureNeonLocal();

const { neon } = await import("@neondatabase/serverless");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[wait-for-db] DATABASE_URL não definido.");
  process.exit(1);
}

const sql = neon(connectionString);
const timeoutMs = Number(process.env.NEON_LOCAL_WAIT_MS || 120_000);
const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  try {
    await sql`select 1 as ok`;
    console.log("[wait-for-db] Neon Local pronto.");
    process.exit(0);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

console.error(
  `[wait-for-db] Neon Local não ficou pronto em ${timeoutMs}ms. Rode 'bun run db:local:logs'.`,
);
process.exit(1);

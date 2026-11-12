import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import path from "node:path";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(connectionString);
const db = drizzle(sql);

const migrationsFolder = path.resolve(import.meta.dirname, "migrations");

console.log("Applying database migrations with Neon HTTP driver...");
try {
  await migrate(db, { migrationsFolder });
  console.log("✓ Migrations applied successfully!");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}

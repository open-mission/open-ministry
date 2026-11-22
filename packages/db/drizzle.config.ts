import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

import { drizzleKitUrl } from "./src/neon-config";

for (const file of [
  ".env.local",
  ".env",
  "../../.env.local",
  "../../.env",
  "../app/.env.local",
  "../../apps/app/.env.local",
]) {
  config({ path: path.resolve(process.cwd(), file) });
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: drizzleKitUrl(),
  },
  verbose: true,
  strict: true,
});

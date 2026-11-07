import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const dbPath = fileURLToPath(
  new URL("../src/db/index.ts", import.meta.url),
);
const original = readFileSync(dbPath, "utf8");
const withoutServerOnly = original.replace(
  /^import "server-only";\r?\n/,
  "",
);

try {
  if (withoutServerOnly !== original) {
    writeFileSync(dbPath, withoutServerOnly);
  }

  const result = spawnSync(
    "bun",
    [
      "x",
      "better-auth",
      "generate",
      "--config",
      "src/lib/auth.ts",
      "--output",
      "src/db/schema/auth.ts",
      "-y",
    ],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  process.exitCode = result.status ?? 1;
} finally {
  if (withoutServerOnly !== original) {
    writeFileSync(dbPath, original);
  }
}

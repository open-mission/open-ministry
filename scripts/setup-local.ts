import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const APP_ENV_PATH = path.join(ROOT, "apps/app/.env");
const EXAMPLE_PATH = path.join(ROOT, ".env.example");

const LOCAL_DATABASE_URL =
  "postgres://neon:npg@localhost:5432/neondb?sslmode=require";
const DEFAULT_PARENT_BRANCH_ID = "br-holy-truth-bb9hmcnq";
// Chave da API só é usada pelo container; não replicamos em apps/app/.env.
const TOOLING_ONLY_KEYS = new Set(["NEON_API_KEY"]);

function fail(message: string): never {
  console.error(`[setup:local] ${message}`);
  process.exit(1);
}

function dockerAvailable(): boolean {
  const result = spawnSync(
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return result.status === 0;
}

function readEnvFile(filePath: string): Map<string, string> {
  const values = new Map<string, string>();
  if (!existsSync(filePath)) return values;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

/**
 * Atualiza um arquivo .env preservando comentários, ordem e chaves que não
 * serão tocadas. Substitui todas as ocorrências da chave e acrescenta as que
 * faltarem no final.
 */
function upsertEnv(filePath: string, entries: Map<string, string>): string {
  const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  let next = current;

  for (const [key, value] of entries) {
    const pattern = new RegExp(`^${key}=.*$`, "gm");
    if (pattern.test(next)) {
      next = next.replace(pattern, `${key}=${value}`);
    } else {
      const separator = next === "" || next.endsWith("\n") ? "" : "\n";
      next = `${next}${separator}${key}=${value}\n`;
    }
  }

  if (next !== current) {
    if (current !== "") {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      copyFileSync(filePath, `${filePath}.bak.${stamp}`);
    }
    writeFileSync(filePath, next, { encoding: "utf8", mode: 0o600 });
  }

  return next;
}

if (!existsSync(EXAMPLE_PATH)) fail(`.env.example não encontrado em ${EXAMPLE_PATH}`);

if (!dockerAvailable()) {
  fail(
    "Docker não está rodando. Inicie o Docker Desktop/OrbStack e tente novamente.",
  );
}

const env = readEnvFile(ENV_PATH);
const example = readEnvFile(EXAMPLE_PATH);

// Um .env recém-criado a partir do .env.example precisa das chaves do modelo.
for (const [key, value] of example) {
  if (!env.has(key)) env.set(key, value);
}

const apiKey = process.env.NEON_API_KEY || env.get("NEON_API_KEY") || "";
const projectId =
  process.env.NEON_PROJECT_ID || env.get("NEON_PROJECT_ID") || "";

if (!apiKey) {
  fail(
    "NEON_API_KEY não definido (ambiente ou .env). Gere em https://console.neon.tech/app/settings/api-keys",
  );
}
if (!projectId) fail("NEON_PROJECT_ID não definido (ambiente ou .env).");

const parentBranchId =
  process.env.NEON_LOCAL_PARENT_BRANCH_ID ||
  env.get("NEON_LOCAL_PARENT_BRANCH_ID") ||
  DEFAULT_PARENT_BRANCH_ID;

if (parentBranchId === "br-royal-term-bbveh4nm") {
  fail(
    "NEON_LOCAL_PARENT_BRANCH_ID aponta para o branch de produção. Use o branch `development` (br-holy-truth-bb9hmcnq).",
  );
}

// Um .env local recém-criado precisa de um segredo do Better Auth para o dev.
if (!env.get("BETTER_AUTH_SECRET")) {
  const secret = spawnSync("openssl", ["rand", "-base64", "32"], {
    encoding: "utf8",
  });
  if (secret.status === 0 && secret.stdout.trim()) {
    env.set("BETTER_AUTH_SECRET", secret.stdout.trim());
  }
}

const localEntries = new Map<string, string>([
  ["NEON_LOCAL", "true"],
  ["NEON_API_KEY", apiKey],
  ["NEON_PROJECT_ID", projectId],
  ["NEON_LOCAL_PARENT_BRANCH_ID", parentBranchId],
  ["DATABASE_URL", LOCAL_DATABASE_URL],
  // O Neon Local é HTTP-only: a transação com set_config usada pelo RLS cai no
  // WebSocket e falha. Vazio no dev = leitura com RLS desabilitada no app.
  ["DATABASE_AUTHENTICATED_URL", ""],
]);

upsertEnv(ENV_PATH, localEntries);

// O Next carrega `apps/app/.env` e ignora o .env da raiz (o turbo não carrega
// arquivos .env). Sem esta sincronização, o app continuaria no banco remoto
// enquanto as migrations rodariam no local.
const appEntries = new Map(
  [...env.entries()].filter(([key]) => !TOOLING_ONLY_KEYS.has(key)),
);
for (const [key, value] of localEntries) {
  if (!TOOLING_ONLY_KEYS.has(key)) appEntries.set(key, value);
}
appEntries.set("BETTER_AUTH_SECRET", env.get("BETTER_AUTH_SECRET") ?? "");
upsertEnv(APP_ENV_PATH, appEntries);

const appEnv = readEnvFile(APP_ENV_PATH);
const appDbUrl = appEnv.get("DATABASE_URL") ?? "";

if (!appDbUrl.includes("@localhost:") && !appDbUrl.includes("@db:")) {
  fail(
    `apps/app/.env continua apontando para um banco remoto (${appDbUrl.replace(/\/\/[^@]*@/, "//***@")}).`,
  );
}

console.log("[setup:local] .env e apps/app/.env prontos para o Neon Local.");
console.log(
  `[setup:local] branch pai: ${parentBranchId === DEFAULT_PARENT_BRANCH_ID ? "development" : parentBranchId}.`,
);
console.log(
  "[setup:local] app e drizzle-kit usam o mesmo banco: postgres://localhost:5432/neondb.",
);
console.log("[setup:local] segredos existentes foram preservados.");

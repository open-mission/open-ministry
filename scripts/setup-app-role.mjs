import "dotenv/config";

import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";

// Local:
//   node scripts/setup-app-role.mjs
// Production (uses the unpooled admin URL and always generates a fresh credential):
//   DATABASE_URL=<unpooled-url> node scripts/setup-app-role.mjs --url-out <file>

const ROLE = "app_authenticated";
const ENV_KEY = "DATABASE_AUTHENTICATED_URL";
const ENV_FILE = ".env";
const urlOutIndex = process.argv.indexOf("--url-out");
const urlOut = urlOutIndex >= 0 ? process.argv[urlOutIndex + 1] : null;

function buildAuthenticatedUrl(password) {
  const url = new URL(process.env.DATABASE_URL);
  url.username = ROLE;
  url.password = password;

  // Prefer the pooled endpoint when the admin URL is unpooled.
  if (!url.host.includes("-pooler.")) {
    url.host = url.host.replace(/^(ep-[^.]+)\./, "$1-pooler.");
  }

  return url.toString();
}

function ensureEnvEntry(value) {
  const current = readFileSync(ENV_FILE, "utf8");

  if (current.match(new RegExp(`^${ENV_KEY}=`, "m"))) {
    throw new Error(
      `${ENV_KEY} já existe no ${ENV_FILE}, mas não foi carregada. ` +
        "Remova a linha antiga e rode o script novamente.",
    );
  }

  const separator = current.endsWith("\n") ? "" : "\n";
  appendFileSync(ENV_FILE, `${separator}${ENV_KEY}=${value}\n`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definida no .env.");
  }

  let authenticatedUrl = urlOut ? null : process.env[ENV_KEY];
  let password;

  if (authenticatedUrl) {
    const parsed = new URL(authenticatedUrl);

    if (parsed.username !== ROLE) {
      throw new Error(
        `${ENV_KEY} deve usar o usuário "${ROLE}", mas está usando "${parsed.username}".`,
      );
    }

    password = decodeURIComponent(parsed.password);
  } else {
    password = randomBytes(24).toString("base64url");
    authenticatedUrl = buildAuthenticatedUrl(password);

    if (urlOut) {
      writeFileSync(urlOut, authenticatedUrl, { mode: 0o600 });
    } else {
      ensureEnvEntry(authenticatedUrl);
    }

    process.env[ENV_KEY] = authenticatedUrl;
  }

  if (!password) {
    throw new Error(`Não foi possível extrair a senha de ${ENV_KEY}.`);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const escapedPassword = client.escapeLiteral(password);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}') THEN
          CREATE ROLE ${ROLE} LOGIN PASSWORD ${escapedPassword} NOBYPASSRLS;
        ELSE
          ALTER ROLE ${ROLE} WITH LOGIN PASSWORD ${escapedPassword} NOBYPASSRLS;
        END IF;
      END
      $$;
    `);

    await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE};`);
    await client.query(`
      GRANT SELECT ON TABLE
        public.organization,
        public.member,
        public.invitation,
        public."user"
      TO ${ROLE};
    `);

    const parsed = new URL(authenticatedUrl);
    const location = urlOut
      ? `em ${urlOut}`
      : `em ${ENV_FILE} como ${ENV_KEY}`;

    console.log(
      `Role "${ROLE}" pronto em ${parsed.host}${parsed.pathname}. ` +
        `A URL autenticada está ${location}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

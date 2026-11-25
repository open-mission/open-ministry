import { config } from "dotenv";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "apps/app/.env") });

const args = process.argv.slice(2);
const emailIndex = args.indexOf("--email");
const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
const revoke = args.includes("--revoke");

function bootstrapEmails(): string[] {
  return (process.env.PLATFORM_SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.includes("@"));
}

function fail(message: string): never {
  console.error(`[platform:set-super-admin] ${message}`);
  process.exit(1);
}

if (!email || !email.includes("@")) {
  fail("Uso: bun run platform:set-super-admin -- --email <email> [--revoke]");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail("DATABASE_URL não definida.");

const normalized = email.trim().toLowerCase();
const sql = neon(connectionString);

const rows = await sql`
  select id, email, role from "user" where lower(email) = ${normalized} limit 1
`;
const user = rows[0] as { id: string; email: string; role: string | null } | undefined;

if (!user) fail(`Usuário com e-mail ${normalized} não encontrado.`);

if (revoke) {
  if (bootstrapEmails().includes(normalized)) {
    fail(
      "Este e-mail é bootstrap (.env) e não pode ter o papel revogado por aqui.",
    );
  }

  const rowsWithRole = (await sql`
    select id, role from "user" where lower(role) like '%super_admin%'
  `) as { id: string; role: string | null }[];

  // Correspondência exata do token, sem LIKE amplo: papéis que apenas contêm
  // a substring não contam como operadores da plataforma.
  const superAdmins = rowsWithRole.filter((item) =>
    (item.role ?? "")
      .split(",")
      .map((role) => role.trim().toLowerCase())
      .includes("super_admin"),
  );

  const selfIsSuperAdmin = superAdmins.some((item) => item.id === user.id);
  if (selfIsSuperAdmin && superAdmins.length <= 1) {
    fail("Não é possível remover o último Super Admin.");
  }

  await sql`update "user" set role = 'user' where id = ${user.id}`;
  console.log(`[platform:set-super-admin] papel revogado de ${normalized}.`);
} else {
  await sql`update "user" set role = 'super_admin' where id = ${user.id}`;
  console.log(`[platform:set-super-admin] ${normalized} promovido a super_admin.`);
}

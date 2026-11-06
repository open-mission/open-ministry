import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("dotenv/config");
const { Client } = require("pg");

const base = process.env.APP_URL ?? "http://localhost:3000";
const origin = base;
const suffix = Date.now();
const password = "senha12345";

function cookieHeader(response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

async function createUser(label) {
  const email = `rls.${label}.${suffix}@example.com`;
  const response = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: `RLS ${label}`,
      email,
      password,
    }),
  });
  const cookie = cookieHeader(response);
  assert.ok(response.ok && cookie, `signup ${label} failed`);

  const orgName = `RLS ${label} ${suffix}`;
  const slug = `rls-${label}-${suffix}`;
  const orgResponse = await fetch(`${base}/api/auth/organization/create`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, cookie },
    body: JSON.stringify({ name: orgName, slug }),
  });
  const organization = await orgResponse.json();
  assert.ok(orgResponse.ok && organization.id, `create org ${label} failed`);

  const activeResponse = await fetch(
    `${base}/api/auth/organization/set-active`,
    {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie },
      body: JSON.stringify({ organizationId: organization.id }),
    },
  );
  assert.ok(activeResponse.ok, `set active ${label} failed`);

  const tokenResponse = await fetch(`${base}/api/auth/token`, {
    headers: { cookie, origin },
  });
  const { token } = await tokenResponse.json();
  assert.ok(tokenResponse.ok && token, `token ${label} failed`);

  const claims = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );

  return { email, cookie, organization, token, claims };
}

async function main() {
  assert.ok(
    process.env.DATABASE_AUTHENTICATED_URL,
    "DATABASE_AUTHENTICATED_URL não está definida.",
  );

  const created = [];

  try {
    const userA = await createUser("a");
    created.push(userA);
    const userB = await createUser("b");
    created.push(userB);

    assert.ok(userA.claims.sub);
    assert.notEqual(userA.claims.sub, userB.claims.sub);
    assert.equal(userA.claims.org_id, userA.organization.id);
    assert.equal(userB.claims.org_id, userB.organization.id);

    const app = new Client({
      connectionString: process.env.DATABASE_AUTHENTICATED_URL,
      ssl: { rejectUnauthorized: false },
    });
    await app.connect();

    async function viewAs(claims) {
      await app.query("begin");
      await app.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(claims),
      ]);
      const organizations = await app.query(
        `select id, name from organization`,
      );
      const members = await app.query(
        `select id, user_id, organization_id from member`,
      );
      const users = await app.query(`select id, email from "user"`);
      const invitations = await app.query(`select id from invitation`);
      await app.query("rollback");
      return {
        organizations: organizations.rows,
        members: members.rows,
        users: users.rows,
        invitations: invitations.rows.length,
      };
    }

    try {
      const viewA = await viewAs(userA.claims);
      const viewB = await viewAs(userB.claims);
      const viewUnknown = await viewAs({ sub: "rls-unknown-user" });

      assert.deepEqual(
        viewA.organizations.map((organization) => organization.id),
        [userA.organization.id],
        "user A should only see org A",
      );
      assert.deepEqual(
        viewB.organizations.map((organization) => organization.id),
        [userB.organization.id],
        "user B should only see org B",
      );
      assert.ok(
        viewA.members.every(
          (member) => member.organization_id === userA.organization.id,
        ),
        "user A should only see members of org A",
      );
      assert.ok(
        viewB.members.every(
          (member) => member.organization_id === userB.organization.id,
        ),
        "user B should only see members of org B",
      );
      assert.ok(
        viewA.users.every((user) => user.id === userA.claims.sub),
        "user A should not see user B",
      );
      assert.equal(viewUnknown.organizations.length, 0);
      assert.equal(viewUnknown.members.length, 0);
      assert.equal(viewUnknown.users.length, 0);

      console.log("RLS smoke test passed");
      console.log({
        userA: viewA.organizations.map((organization) => organization.name),
        userB: viewB.organizations.map((organization) => organization.name),
        unknownRows:
          viewUnknown.organizations.length +
          viewUnknown.members.length +
          viewUnknown.users.length,
      });
    } finally {
      await app.end();
    }
  } finally {
    if (created.length > 0) {
      const owner = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      await owner.connect();
      try {
        for (const user of created) {
          await owner.query(`delete from organization where id = $1`, [
            user.organization.id,
          ]);
          await owner.query(`delete from "user" where email = $1`, [
            user.email,
          ]);
        }
      } finally {
        await owner.end();
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

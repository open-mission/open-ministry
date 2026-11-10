#!/usr/bin/env node

/**
 * Smoke test for RBAC/ABAC Permissions and Modules system.
 *
 * Runs only when TEST_DATABASE_URL is provided to guarantee no unintended
 * modifications to production or staging databases.
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.log(
    "SKIP: TEST_DATABASE_URL não está definida. O smoke test de permissões não foi executado para evitar tocar em banco de produção.",
  );
  process.exit(0);
}

const { Client } = require("pg");

async function runSmokeTest() {
  console.log("Iniciando smoke test de permissões em banco descartável...");

  const client = new Client({
    connectionString: testDatabaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // 1. Verificar existência das tabelas de permissões e módulos
    const requiredTables = [
      "organization_module",
      "organization_permission_policy",
      "department_module",
      "department_permission_grant",
    ];

    for (const table of requiredTables) {
      const res = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );`,
        [table],
      );
      assert.equal(
        res.rows[0].exists,
        true,
        `Tabela ${table} deve existir no banco de dados.`,
      );
    }
    console.log("✓ Todas as tabelas de permissões e módulos existem.");

    // 2. Verificar colunas essenciais de department_permission_grant
    const grantColumnsRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'department_permission_grant';`,
    );
    const grantCols = new Set(grantColumnsRes.rows.map((r) => r.column_name));
    for (const col of [
      "organization_id",
      "department_id",
      "grantee_user_id",
      "module_key",
      "action",
      "revoked_at",
      "granted_by_user_id",
    ]) {
      assert.ok(
        grantCols.has(col),
        `Coluna ${col} deve existir em department_permission_grant`,
      );
    }
    console.log("✓ Colunas de department_permission_grant validadas.");

    // 3. Testar inserção e revogação de grant com isolamento
    const suffix = Date.now();
    const testOrgId = `smoke_org_${suffix}`;
    const testDeptId = `smoke_dept_${suffix}`;
    const testUserId = `smoke_user_${suffix}`;
    const testAdminId = `smoke_admin_${suffix}`;

    await client.query("BEGIN;");

    // Inserir grant temporário
    const insertRes = await client.query(
      `INSERT INTO department_permission_grant (
        id, organization_id, department_id, grantee_user_id, module_key, action, granted_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, revoked_at;`,
      [
        `grant_${suffix}`,
        testOrgId,
        testDeptId,
        testUserId,
        "music",
        "createSong",
        testAdminId,
      ],
    );

    assert.equal(insertRes.rows.length, 1);
    assert.equal(insertRes.rows[0].revoked_at, null);

    // Revogar grant
    const revokeRes = await client.query(
      `UPDATE department_permission_grant
       SET revoked_at = NOW(), revoked_by_user_id = $1
       WHERE id = $2
       RETURNING id, revoked_at;`,
      [testAdminId, `grant_${suffix}`],
    );

    assert.equal(revokeRes.rows.length, 1);
    assert.notEqual(revokeRes.rows[0].revoked_at, null);

    await client.query("ROLLBACK;");
    console.log("✓ Ciclo de vida de grant e revogação imediata verificado.");

    console.log("Smoke test de permissões finalizado com sucesso!");
  } finally {
    await client.end();
  }
}

runSmokeTest().catch((err) => {
  console.error("Falha no smoke test de permissões:", err);
  process.exit(1);
});

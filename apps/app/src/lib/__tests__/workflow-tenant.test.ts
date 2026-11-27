import { describe, expect, it, mock } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

let jobRow: { id: string; status: string } | null = null;
let departmentRow: { id: string } | null = null;
const whereClauses: SQL[] = [];

mock.module("server-only", () => ({}));
mock.module("@/db", () => ({
  db: {
    query: {
      backgroundJob: {
        findFirst: async (args: { where?: SQL }) => {
          if (args?.where) whereClauses.push(args.where);
          return jobRow;
        },
      },
      department: {
        findFirst: async (args: { where?: SQL }) => {
          if (args?.where) whereClauses.push(args.where);
          return departmentRow;
        },
      },
    },
  },
}));

const tenant = await import(`@/lib/workflows/tenant?wave6=${Date.now()}`);

describe("workflow tenant helpers", () => {
  it("monta WHERE com jobId e organizationId", () => {
    const clause = tenant.jobInOrganizationWhere("job-1", "org-1");
    const query = new PgDialect().sqlToQuery(clause);

    expect(query.sql).toContain('"id" =');
    expect(query.sql).toContain('"organization_id" =');
    expect(query.params).toContain("job-1");
    expect(query.params).toContain("org-1");
  });

  it("falha fechado quando o job não pertence à organização", async () => {
    jobRow = null;
    whereClauses.length = 0;

    await expect(
      tenant.requireJobInOrganization("job-1", "org-2"),
    ).rejects.toThrow("nesta organização");
    expect(whereClauses).toHaveLength(1);
  });

  it("nega departamento de outra igreja", async () => {
    departmentRow = null;
    whereClauses.length = 0;

    expect(
      await tenant.departmentBelongsToOrganization("dept-x", "org-1"),
    ).toBe(false);
    expect(whereClauses).toHaveLength(1);
  });

  it("aceita job e departamento da mesma igreja", async () => {
    jobRow = { id: "job-1", status: "pending" };
    departmentRow = { id: "dept-x" };

    expect(await tenant.requireJobInOrganization("job-1", "org-1")).toEqual(
      jobRow,
    );
    expect(
      await tenant.departmentBelongsToOrganization("dept-x", "org-1"),
    ).toBe(true);
  });
});

import { describe, expect, it, mock } from "bun:test";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

mock.module("server-only", () => ({}));

const schema = await import("@/db/schema");

const state = {
  findManyCalls: [] as Array<Record<string, unknown>>,
  findFirstCalls: [] as Array<Record<string, unknown>>,
  selectFieldSets: [] as Array<Record<string, unknown>>,
  fromTables: [] as unknown[],
  innerWheres: [] as unknown[],
  reset() {
    state.findManyCalls = [];
    state.findFirstCalls = [];
    state.selectFieldSets = [];
    state.fromTables = [];
    state.innerWheres = [];
  },
};

mock.module("@/db", () => ({
  db: {
    query: {
      emailMessageLog: {
        findMany: async (args: Record<string, unknown>) => {
          state.findManyCalls.push(args);
          return [];
        },
        findFirst: async (args: Record<string, unknown>) => {
          state.findFirstCalls.push(args);
          return null;
        },
      },
    },
    select: (fields: Record<string, unknown>) => ({
      from: (table: unknown) => ({
        where: (where: unknown) => {
          state.selectFieldSets.push(fields);
          state.fromTables.push(table);
          state.innerWheres.push(where);
          // Objeto compatível com SQLWrapper para o drizzle embutir como
          // subquery; a consulta principal é awaitada e resolve sem rede.
          return { getSQL: () => sql`SUBQUERY_CAPTURE` };
        },
      }),
    }),
  },
}));

// A listagem/reenvio não tocam a Brevo em teste (findMany/findFirst
// retornam vazio), mas o módulo é importado no topo do serviço.
mock.module("@/lib/email/brevo", () => ({
  sendEmailViaBrevo: async () => ({ ok: true, messageId: "brevo-1" }),
  getBrevoApiKey: () => "test-key",
  getDefaultSender: () => ({ email: "test@example.com" }),
}));

const { listEmailMessageLogs, resendLoggedEmail } = await import(
  "@/lib/email/service"
);

const dialect = new PgDialect();
function renderWhere(where: unknown): string {
  return dialect
    .sqlToQuery(where as unknown as SQL)
    .sql.replaceAll('"', "");
}

describe("listEmailMessageLogs — escopo por departamentos", () => {
  it("admin: escopo é organization_id + e-mails de autenticação do próprio usuário, sem subquery de departamento", async () => {
    state.reset();

    const result = await listEmailMessageLogs("org-1", {
      viewerUserId: "user-1",
    });

    expect(result.logs).toEqual([]);
    // 1ª consulta = logs, 2ª = estatísticas do recorte.
    expect(state.findManyCalls.length).toBe(2);

    const logsWhere = renderWhere(state.findManyCalls[0]?.where);
    expect(logsWhere).toContain("email_message_log.organization_id");
    expect(logsWhere).toContain("email_message_log.user_id");
    expect(logsWhere).not.toContain("department_member");

    const statsWhere = renderWhere(state.findManyCalls[1]?.where);
    expect(statsWhere).toContain("email_message_log.organization_id");
    expect(statsWhere).not.toContain("email_message_log.user_id");
    expect(state.selectFieldSets.length).toBe(0);
  });

  it("líder: restringe personId aos membros dos departamentos liderados", async () => {
    state.reset();

    await listEmailMessageLogs("org-1", {
      departmentIds: ["dep-1", "dep-2"],
      viewerUserId: "user-1",
    });

    // A subquery de escopo seleciona os ids de person em departmentMember.
    expect(state.selectFieldSets[0]?.id).toBe(schema.person.id);
    expect(state.fromTables[0]).toBe(schema.departmentMember);
    expect(state.innerWheres[0]).toBeTruthy();

    // Consulta principal recebe a condição composta.
    expect(state.findManyCalls[0]?.where).toBeTruthy();
    // Estatísticas também ficam no recorte (org + departamentos).
    expect(state.findManyCalls[1]?.where).toBeTruthy();
  });

  it("fail-closed: departmentIds vazio não consulta nada", async () => {
    state.reset();

    const result = await listEmailMessageLogs("org-1", {
      departmentIds: [],
      viewerUserId: "user-1",
    });

    expect(result).toEqual({
      logs: [],
      stats: { total: 0, sent: 0, failed: 0 },
    });
    expect(state.findManyCalls.length).toBe(0);
    expect(state.selectFieldSets.length).toBe(0);
  });
});

describe("resendLoggedEmail — escopo de organização", () => {
  it("com organizationId, busca escopada: organization_id igual ou nulo (e-mails de plataforma)", async () => {
    state.reset();

    await resendLoggedEmail("log-1", undefined, "org-1");

    expect(state.findFirstCalls.length).toBe(1);
    const where = renderWhere(state.findFirstCalls[0]?.where);
    expect(where).toContain("email_message_log.id");
    expect(where).toContain("email_message_log.organization_id");
    expect(where).toContain("is null");
  });

  it("sem organizationId, mantém a busca apenas por id (compatibilidade)", async () => {
    state.reset();

    await resendLoggedEmail("log-1");

    expect(state.findFirstCalls.length).toBe(1);
    const where = renderWhere(state.findFirstCalls[0]?.where);
    expect(where).toContain("email_message_log.id");
    expect(where).not.toContain("organization_id");
  });
});

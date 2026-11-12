import { describe, expect, it, mock } from "bun:test";
import { sql } from "drizzle-orm";

mock.module("server-only", () => ({}));

const schema = await import("@/db/schema");

const state = {
  findManyCalls: [] as Array<Record<string, unknown>>,
  selectFieldSets: [] as Array<Record<string, unknown>>,
  fromTables: [] as unknown[],
  innerWheres: [] as unknown[],
  reset() {
    state.findManyCalls = [];
    state.selectFieldSets = [];
    state.fromTables = [];
    state.innerWheres = [];
  },
};

mock.module("@/db", () => ({
  db: {
    query: {
      whatsappMessageLog: {
        findMany: async (args: Record<string, unknown>) => {
          state.findManyCalls.push(args);
          return [];
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
          // subquery; o count query é awaitado e resolve sem rede.
          return { getSQL: () => sql`SUBQUERY_CAPTURE` };
        },
      }),
    }),
  },
}));

const { listEvolutionMessageLogs, retryFailedWhatsAppMessages } = await import(
  "@/lib/notification-service"
);

describe("listEvolutionMessageLogs — escopo por departamentos", () => {
  it("fail-closed: sem departamentos liderados, não consulta nada", async () => {
    state.reset();

    const result = await listEvolutionMessageLogs("org-1", {
      departmentIds: [],
    });

    expect(result).toEqual({ logs: [], total: 0 });
    expect(state.findManyCalls.length).toBe(0);
  });

  it("com departamentos, filtra personId pelos membros desses departamentos", async () => {
    state.reset();

    await listEvolutionMessageLogs("org-1", { departmentIds: ["dep-1", "dep-2"] });

    // A subquery de escopo seleciona os ids de person em departmentMember.
    expect(state.selectFieldSets[0]?.id).toBe(schema.person.id);
    expect(state.fromTables[0]).toBe(schema.departmentMember);
    expect(state.innerWheres[0]).toBeTruthy();

    // A consulta principal recebe a condição composta.
    expect(state.findManyCalls[0]?.where).toBeTruthy();
  });

  it("sem departmentIds (admin), não monta subquery de escopo", async () => {
    state.reset();

    await listEvolutionMessageLogs("org-1", { limit: 10 });

    // Único select é o de count na própria tabela de logs.
    expect(state.selectFieldSets[0]?.count).toBeTruthy();
    expect(state.fromTables[0]).toBe(schema.whatsappMessageLog);
    expect(state.selectFieldSets.length).toBe(1);
    expect(state.findManyCalls[0]?.where).toBeTruthy();
  });
});

describe("retryFailedWhatsAppMessages — escopo por departamentos", () => {
  it("fail-closed: sem departamentos liderados, não consulta nem reenvia", async () => {
    state.reset();

    const result = await retryFailedWhatsAppMessages("org-1", undefined, []);

    expect(result).toEqual({ total: 0, sent: 0, failed: 0 });
    expect(state.findManyCalls.length).toBe(0);
  });

  it("com departamentos, restringe aos membros desses departamentos", async () => {
    state.reset();

    const result = await retryFailedWhatsAppMessages("org-1", undefined, [
      "dep-1",
    ]);

    expect(result).toEqual({ total: 0, sent: 0, failed: 0 });
    expect(state.selectFieldSets[0]?.id).toBe(schema.person.id);
    expect(state.fromTables[0]).toBe(schema.departmentMember);
    expect(state.innerWheres[0]).toBeTruthy();
  });

  it("sem departmentIds (admin), não monta subquery de escopo", async () => {
    state.reset();

    await retryFailedWhatsAppMessages("org-1", undefined, undefined);

    expect(state.selectFieldSets.length).toBe(0);
    expect(state.findManyCalls[0]?.where).toBeTruthy();
  });
});

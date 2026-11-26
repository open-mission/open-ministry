import { beforeEach, describe, expect, it, mock } from "bun:test";

let canManage = true;
let hasContext = true;
let templateFound = true;

const insertCalls: Array<Record<string, unknown>[]> = [];
const deleteCalls: number[] = [];

// Reaplicado a cada teste: o runner compartilha mocks de módulo entre arquivos.
function installMocks() {
  mock.module("server-only", () => ({}));

  mock.module("@/lib/organizations", () => ({
    requireOrganizationContext: async () => null,
    getOrganizationContext: async () =>
      hasContext
        ? {
            organization: { id: "org-1", name: "Igreja" },
            session: { user: { id: "user-1" } },
            isAdmin: true,
          }
        : null,
  }));

  mock.module("@/lib/events/action-helpers", () => ({
    canManageEventPlan: async () => canManage,
    revalidateEvents: async () => {},
    optionalText: (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : null,
  }));

  mock.module("@/db", () => ({
    db: {
      delete: () => ({
        where: () => {
          deleteCalls.push(1);
          return Promise.resolve();
        },
      }),
      insert: () => ({
        values: (rows: Record<string, unknown>[]) => {
          insertCalls.push(rows);
          return Promise.resolve();
        },
      }),
      query: {
        planTemplate: {
          findFirst: async () =>
            templateFound
              ? {
                  id: "tpl-1",
                  items: [
                    { type: "item", title: "Abertura", durationSeconds: 60 },
                    { type: "header", title: "Louvor", durationSeconds: 0 },
                  ],
                }
              : null,
        },
      },
    },
  }));
}

installMocks();

let loadId = 0;

async function loadActions() {
  // Query única por teste: força uma nova instância ligada aos mocks atuais,
  // já que o runner compartilha mocks de módulo entre arquivos.
  const suffix = `?wave4=${++loadId}`;
  const planItems = await import(`@/app/actions/events/plan-items${suffix}`);
  const planTemplates = await import(`@/app/actions/events/plan-templates${suffix}`);
  return {
    importPlanItemsAction: planItems.importPlanItemsAction,
    applyPlanTemplateAction: planTemplates.applyPlanTemplateAction,
  };
}

beforeEach(() => {
  canManage = true;
  hasContext = true;
  templateFound = true;
  insertCalls.length = 0;
  deleteCalls.length = 0;
  installMocks();
});

describe("importPlanItemsAction — insert em lote", () => {
  it("grava todas as linhas em um único insert, na ordem original", async () => {
    const { importPlanItemsAction } = await loadActions();
    const result = await importPlanItemsAction("event-1", [
      { type: "header", title: " Abertura ", durationSeconds: 0 },
      { type: "item", title: "Música", durationSeconds: 90, songId: "song-1" },
      { type: "item", title: "", durationSeconds: 10 },
    ]);

    expect(result).toEqual({ ok: true });
    expect(deleteCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toHaveLength(2);
    expect(insertCalls[0][0]).toMatchObject({
      eventId: "event-1",
      type: "header",
      title: "Abertura",
      order: 0,
    });
    expect(insertCalls[0][1]).toMatchObject({
      type: "item",
      title: "Música",
      order: 1,
      songId: "song-1",
    });
  });

  it("rejeita mais de 500 itens antes de apagar ou inserir no banco", async () => {
    const { importPlanItemsAction } = await loadActions();
    const items = Array.from({ length: 501 }, (_, index) => ({
      type: "item" as const,
      title: `Item ${index}`,
    }));

    const result = await importPlanItemsAction("event-1", items);

    expect(result).toEqual({
      ok: false,
      error: "Limite máximo de 500 itens por cronograma.",
    });
    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it("bloqueia sessão ausente, permissão insuficiente e lista vazia", async () => {
    const { importPlanItemsAction } = await loadActions();
    hasContext = false;
    expect((await importPlanItemsAction("event-1", [{ title: "A" }])).ok).toBe(false);
    expect(insertCalls).toHaveLength(0);

    hasContext = true;
    canManage = false;
    expect((await importPlanItemsAction("event-1", [{ title: "A" }])).ok).toBe(false);
    expect(insertCalls).toHaveLength(0);

    canManage = true;
    expect((await importPlanItemsAction("event-1", [])).ok).toBe(false);
    expect(insertCalls).toHaveLength(0);
  });
});

describe("applyPlanTemplateAction — insert em lote", () => {
  it("aplica starter e modelo salvo com uma única escrita", async () => {
    const { applyPlanTemplateAction } = await loadActions();
    expect((await applyPlanTemplateAction("event-1", "custom")).ok).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toHaveLength(2);

    insertCalls.length = 0;
    expect((await applyPlanTemplateAction("event-1", "starter")).ok).toBe(true);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]!.length).toBeGreaterThan(2);
  });

  it("não apaga o cronograma quando o modelo não existe", async () => {
    const { applyPlanTemplateAction } = await loadActions();
    templateFound = false;
    const result = await applyPlanTemplateAction("event-1", "missing");
    expect(result.ok).toBe(false);
    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let insertedRows: Record<string, unknown>[] | null = null;
let findFirstCalls = 0;
let updateCalls = 0;
let conflictTarget: unknown[] | null = null;

mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => ({
    organization: { id: "org-1", name: "Igreja" },
    session: { user: { id: "user-1" } },
    isAdmin: false,
  }),
}));

mock.module("@/lib/people", () => ({
  ensurePersonForUser: async () => ({ id: "person-1" }),
}));

mock.module("@/lib/permissions/service", () => ({
  requirePermission: async () => {},
}));

mock.module("@/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: () => ({
          findFirst: async () => {
            findFirstCalls++;
            return null;
          },
          findMany: async () => [],
        }),
      },
    ),
    insert: () => ({
      values: (rows: Record<string, unknown>[]) => ({
        onConflictDoUpdate: (args: { target: unknown[] }) => {
          insertedRows = rows;
          conflictTarget = args.target;
          return Promise.resolve();
        },
      }),
    }),
    update: () => {
      updateCalls++;
      return { set: () => ({ where: () => Promise.resolve() }) };
    },
  },
}));

const { saveMyAvailabilityAction } = await import("@/app/actions/availability");

beforeEach(() => {
  insertedRows = null;
  conflictTarget = null;
  findFirstCalls = 0;
  updateCalls = 0;
});

describe("saveMyAvailabilityAction — upsert em lote", () => {
  it("escreve todos os dias em um único insert com onConflictDoUpdate", async () => {
    const result = await saveMyAvailabilityAction({
      days: [
        { dayOfWeek: 0, periods: ["morning"] },
        { dayOfWeek: 3, periods: ["evening"], notes: " Folga " },
      ],
      generalNotes: "Observação geral",
    });

    expect(result.ok).toBe(true);
    expect(insertedRows).toHaveLength(2);
    expect(findFirstCalls).toBe(0);
    expect(updateCalls).toBe(0);
    expect(insertedRows![0]).toMatchObject({
      organizationId: "org-1",
      personId: "person-1",
      dayOfWeek: 0,
      periods: ["morning"],
      notes: "Observação geral",
    });
    expect(insertedRows![1]).toMatchObject({
      dayOfWeek: 3,
      notes: "Folga",
    });
    expect(conflictTarget).toHaveLength(3);
  });

  it("mantém os guards de dias duplicados e acima de 7", async () => {
    const duplicate = await saveMyAvailabilityAction({
      days: [
        { dayOfWeek: 1, periods: [] },
        { dayOfWeek: 1, periods: [] },
      ],
    });
    expect(duplicate.ok).toBe(false);
    expect(insertedRows).toBeNull();

    const tooMany = await saveMyAvailabilityAction({
      days: Array.from({ length: 8 }, (_, dayOfWeek) => ({
        dayOfWeek,
        periods: [],
      })),
    });
    expect(tooMany.ok).toBe(false);
    expect(insertedRows).toBeNull();
  });
});

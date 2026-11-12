import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as nextServer from "next/server";

const state = {
  currentSongIds: ["song-a", "song-b", "song-c"],
  maxSortOrder: 8 as number | null,
  inserts: [] as Array<Record<string, unknown>>,
  batchCalls: [] as unknown[][],
  updates: [] as Array<{
    values: Record<string, unknown>;
    where: unknown;
  }>,
  permissions: { createSong: true, updateSong: true },
};

mock.module("@/db", () => ({
  db: {
    query: new Proxy(
      {},
      {
        get: (_target, table: string) => ({
          findFirst: async () =>
            table === "song" && state.maxSortOrder !== null
              ? { sortOrder: state.maxSortOrder }
              : null,
          findMany: async () =>
            table === "song"
              ? state.currentSongIds.map((id) => ({ id }))
              : [],
        }),
      },
    ),
    insert: (_table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          state.inserts.push(values);
          return [{ ...values }];
        },
      }),
    }),
    update: (_table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: (where: unknown) => {
          const update = { values, where };
          state.updates.push(update);
          return update;
        },
      }),
    }),
    batch: async (queries: unknown[]) => {
      state.batchCalls.push(queries);
      return [];
    },
  },
}));

mock.module("next/server", () => ({
  ...nextServer,
  connection: async () => undefined,
}));
mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => ({
    session: { user: { id: "user-1" } },
    organization: { id: "org-1", name: "Church" },
  }),
}));
mock.module("@/lib/permissions/service", () => ({
  can: async (moduleKey: string, action: string) =>
    moduleKey === "music" &&
    state.permissions[action as keyof typeof state.permissions] === true,
  requirePermission: async () => undefined,
}));
mock.module("@/lib/cache", () => ({
  cacheInvalidateTags: async () => undefined,
  remember: async (_key: string, _ttl: number, callback: () => unknown) =>
    callback(),
}));
type SongActionResult = { ok: boolean; error?: string };
type ReorderAction = (ids: string[]) => Promise<SongActionResult>;

async function callReorder(ids: string[]) {
  const actions = await import("@/app/actions/songs");
  const reorder = (actions as unknown as { reorderSongsAction?: ReorderAction })
    .reorderSongsAction;
  return reorder?.(ids);
}

async function callNextSongSortOrder() {
  const songs = await import("@/lib/songs");
  const getNext = (
    songs as unknown as {
      getNextSongSortOrder?: (organizationId: string) => Promise<number>;
    }
  ).getNextSongSortOrder;
  return getNext?.("org-1");
}

beforeEach(() => {
  state.currentSongIds = ["song-a", "song-b", "song-c"];
  state.maxSortOrder = 8;
  state.inserts = [];
  state.batchCalls = [];
  state.updates = [];
  state.permissions = { createSong: true, updateSong: true };
});

describe("song order persistence", () => {
  it("computes the next order after the current maximum", async () => {
    expect(await callNextSongSortOrder()).toBe(9);
  });

  it("starts at zero when an organization has no songs", async () => {
    state.maxSortOrder = null;

    expect(await callNextSongSortOrder()).toBe(0);
  });

  it("appends server-action creations after the current maximum", async () => {
    const actions = await import("@/app/actions/songs");
    const formData = new FormData();
    formData.set("title", "Canção nova");

    const result = await actions.createSongAction(formData);

    expect(result.ok).toBe(true);
    expect(state.inserts[0]?.sortOrder).toBe(9);
  });

  it("appends REST creations after the current maximum", async () => {
    const route = await import("@/app/api/songs/route");
    const request = new Request("http://localhost/api/songs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Canção pela API" }),
    });

    const response = await route.POST(request as never);

    expect(response.status).toBe(201);
    expect(state.inserts[0]?.sortOrder).toBe(9);
  });

  it("rejects duplicate IDs without writing positions", async () => {
    const result = await callReorder(["song-a", "song-a", "song-c"]);

    expect(result?.ok).toBe(false);
    expect(state.batchCalls).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("rejects an incomplete order without writing positions", async () => {
    const result = await callReorder(["song-a", "song-b"]);

    expect(result?.ok).toBe(false);
    expect(state.batchCalls).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("rejects IDs from outside the organization without writing positions", async () => {
    const result = await callReorder(["song-a", "song-b", "foreign-song"]);

    expect(result?.ok).toBe(false);
    expect(state.batchCalls).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("requires update permission before reading or writing the order", async () => {
    state.permissions.updateSong = false;

    const result = await callReorder(["song-a", "song-b", "song-c"]);

    expect(result?.ok).toBe(false);
    expect(state.batchCalls).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("writes a complete valid order through one database batch", async () => {
    const result = await callReorder(["song-c", "song-a", "song-b"]);

    expect(result?.ok).toBe(true);
    expect(state.batchCalls).toHaveLength(1);
    expect(state.batchCalls[0]).toHaveLength(3);
    expect(
      state.updates.map(({ values, where }) => ({
        sortOrder: values.sortOrder,
        where: new PgDialect().sqlToQuery(where as SQL).params,
      })),
    ).toEqual([
      { sortOrder: 0, where: ["song-c", "org-1"] },
      { sortOrder: 1, where: ["song-a", "org-1"] },
      { sortOrder: 2, where: ["song-b", "org-1"] },
    ]);
  });
});

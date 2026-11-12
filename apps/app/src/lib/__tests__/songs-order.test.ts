import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";

import { song } from "@/db/schema/songs";

type MoveSongId = (
  ids: string[],
  activeId: string,
  overId: string,
) => string[];

async function moveSongId(
  ids: string[],
  activeId: string,
  overId: string,
) {
  const orderModule = await import("@/lib/songs-order").catch(() => null);
  const move = (orderModule as { moveSongId?: MoveSongId } | null)?.moveSongId;
  return move?.(ids, activeId, overId);
}

describe("shared song ordering", () => {
  it("moves a song after the target without dropping or duplicating IDs", async () => {
    const ids = ["song-a", "song-b", "song-c", "song-d"];

    const moved = await moveSongId(ids, "song-b", "song-d");

    expect(moved).toEqual(["song-a", "song-c", "song-d", "song-b"]);
    expect(new Set(moved).size).toBe(ids.length);
  });

  it("moves a song before the target without mutating the original list", async () => {
    const ids = ["song-a", "song-b", "song-c", "song-d"];

    const moved = await moveSongId(ids, "song-d", "song-b");

    expect(moved).toEqual(["song-a", "song-d", "song-b", "song-c"]);
    expect(ids).toEqual(["song-a", "song-b", "song-c", "song-d"]);
  });

  it("keeps capo smallint and defines a defaulted integer manual order", () => {
    const columns = getTableConfig(song).columns;
    const capo = columns.find((column) => column.name === "capo");
    const sortOrder = columns.find((column) => column.name === "sort_order");

    expect(capo?.columnType).toBe("PgSmallInt");
    expect(sortOrder?.columnType).toBe("PgInteger");
    expect(sortOrder?.notNull).toBe(true);
    expect(sortOrder?.default).toBe(0);
  });
});

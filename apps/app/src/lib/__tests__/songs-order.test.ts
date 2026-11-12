import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";

import { song } from "@/db/schema/songs";
import * as songsOrder from "@/lib/songs-order";

type MoveSongId = (
  ids: string[],
  activeId: string,
  overId: string,
) => string[];

type ManualOrderSong = { id: string; title: string; sortOrder: number };
type SongOrderHelpers = {
  isSongReorderingEnabled?: (
    canReorder: boolean,
    sortOption: string,
    hasActiveFilters: boolean,
  ) => boolean;
  getManualSongOrderIds?: (songs: ManualOrderSong[]) => string[];
};

const orderHelpers = songsOrder as unknown as SongOrderHelpers;

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

  it("allows reordering for an authorized, unfiltered manual-order list", () => {
    expect(
      orderHelpers.isSongReorderingEnabled?.(true, "manual", false),
    ).toBe(true);
  });

  it("disables reordering while search or filters hide songs", () => {
    expect(
      orderHelpers.isSongReorderingEnabled?.(true, "manual", true),
    ).toBe(false);
  });

  it("disables reordering outside manual sort mode or without permission", () => {
    expect(
      orderHelpers.isSongReorderingEnabled?.(true, "title", false),
    ).toBe(false);
    expect(
      orderHelpers.isSongReorderingEnabled?.(false, "manual", false),
    ).toBe(false);
  });

  it("calculates complete manual order by position, title, and stable ID", () => {
    const songs = [
      { id: "song-z", title: "Hino Z", sortOrder: 1 },
      { id: "song-c", title: "Hino A", sortOrder: 1 },
      { id: "song-d", title: "Canção D", sortOrder: 2 },
      { id: "song-b", title: "Abertura", sortOrder: 0 },
      { id: "song-a", title: "Hino A", sortOrder: 1 },
      { id: "song-e", title: "Canção C", sortOrder: 2 },
    ];

    const ids = orderHelpers.getManualSongOrderIds?.(songs);

    expect(ids).toEqual([
      "song-b",
      "song-a",
      "song-c",
      "song-z",
      "song-e",
      "song-d",
    ]);
    expect(
      songsOrder.moveSongId(ids ?? [], "song-a", "song-d"),
    ).toEqual(["song-b", "song-c", "song-z", "song-e", "song-d", "song-a"]);
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

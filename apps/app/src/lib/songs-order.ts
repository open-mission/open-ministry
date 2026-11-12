/** Move one song to another song's position without mutating the input list. */
export function moveSongId(
  ids: string[],
  activeId: string,
  overId: string,
): string[] {
  const fromIndex = ids.indexOf(activeId);
  const toIndex = ids.indexOf(overId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return ids;

  const reordered = [...ids];
  const [movedId] = reordered.splice(fromIndex, 1);
  if (movedId === undefined) return ids;
  reordered.splice(toIndex, 0, movedId);

  return reordered;
}

type ManualOrderSong = {
  id: string;
  title: string;
  sortOrder: number;
};

const titleCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function isSongReorderingEnabled(
  canReorder: boolean,
  sortOption: string,
  hasActiveFilters: boolean,
): boolean {
  return canReorder && sortOption === "manual" && !hasActiveFilters;
}

export function getManualSongOrderIds(
  songs: readonly ManualOrderSong[],
): string[] {
  return [...songs]
    .sort((a, b) => {
      const orderDifference = a.sortOrder - b.sortOrder;
      if (orderDifference !== 0) return orderDifference;

      const titleDifference = titleCollator.compare(a.title, b.title);
      if (titleDifference !== 0) return titleDifference;

      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((song) => song.id);
}

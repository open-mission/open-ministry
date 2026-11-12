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

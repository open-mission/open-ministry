export type SongUsageRow = {
  songId: string;
  eventKind: string;
  itemId: string;
  itemTitle: string;
  eventId: string;
  eventTitle: string;
  startsAt: Date | string;
  responsible?: string | null;
};

export type SongUsageEvent = {
  eventId: string;
  eventTitle: string;
  itemId: string;
  itemTitle: string;
  startsAt: Date;
  responsible: string | null;
};

export type SongUsageSummary = {
  nextEvent: SongUsageEvent | null;
  lastEvent: SongUsageEvent | null;
  eventCount: number;
  planItemCount: number;
};

export const EMPTY_SONG_USAGE: SongUsageSummary = {
  nextEvent: null,
  lastEvent: null,
  eventCount: 0,
  planItemCount: 0,
};

function toUsageEvent(row: SongUsageRow): SongUsageEvent {
  return {
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    startsAt: new Date(row.startsAt),
    responsible: row.responsible?.trim() || null,
  };
}

/**
 * Resume o histórico de uso de uma música a partir das linhas de cronograma.
 * `nextEvent` é o próximo culto a partir de `now`; `lastEvent` o mais recente
 * já realizado. O total de cultos conta eventos distintos, não itens.
 */
export function summarizeSongUsage(
  rows: SongUsageRow[],
  now: Date = new Date(),
): SongUsageSummary {
  const serviceRows = rows.filter((row) => row.eventKind === "service");
  if (serviceRows.length === 0) return EMPTY_SONG_USAGE;

  const sorted = [...serviceRows].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const nowTime = now.getTime();
  const eventIds = new Set<string>();

  let nextRow: SongUsageRow | null = null;
  let lastRow: SongUsageRow | null = null;

  for (const row of sorted) {
    eventIds.add(row.eventId);
    const startsAt = new Date(row.startsAt).getTime();
    if (startsAt >= nowTime) {
      if (!nextRow) nextRow = row;
    } else {
      lastRow = row;
    }
  }

  return {
    nextEvent: nextRow ? toUsageEvent(nextRow) : null,
    lastEvent: lastRow ? toUsageEvent(lastRow) : null,
    eventCount: eventIds.size,
    planItemCount: serviceRows.length,
  };
}

/**
 * Agrupa linhas de cronograma por música. As linhas podem vir de qualquer
 * ordem; cada grupo é resumido com o mesmo critério de `summarizeSongUsage`.
 */
export function buildSongUsageMap(
  rows: SongUsageRow[],
  now: Date = new Date(),
): Map<string, SongUsageSummary> {
  const grouped = new Map<string, SongUsageRow[]>();

  for (const row of rows) {
    if (row.eventKind !== "service") continue;

    const list = grouped.get(row.songId);
    if (list) {
      list.push(row);
    } else {
      grouped.set(row.songId, [row]);
    }
  }

  const result = new Map<string, SongUsageSummary>();
  for (const [songId, songRows] of grouped) {
    result.set(songId, summarizeSongUsage(songRows, now));
  }
  return result;
}

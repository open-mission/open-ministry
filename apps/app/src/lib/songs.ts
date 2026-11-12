import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  notInArray,
  or,
} from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import { can } from "@/lib/permissions/service";
import {
  buildSongUsageMap,
  EMPTY_SONG_USAGE,
  type SongUsageRow,
  type SongUsageSummary,
} from "@/lib/song-usage";

export type SongRecord = typeof schema.song.$inferSelect;
export type SongWithUsage = SongRecord & { usage: SongUsageSummary };
export type SongWithDetails = NonNullable<Awaited<ReturnType<typeof getSong>>>;

export async function canAccessMusicModule(
  _organizationId?: string,
  _userId?: string,
  _isAdmin?: boolean,
): Promise<boolean> {
  return can("music", "read");
}

export async function getNextSongSortOrder(
  organizationId: string,
): Promise<number> {
  const lastSong = await db.query.song.findFirst({
    where: eq(schema.song.organizationId, organizationId),
    orderBy: [desc(schema.song.sortOrder)],
    columns: { sortOrder: true },
  });

  return (lastSong?.sortOrder ?? -1) + 1;
}

/**
 * Histórico de uso de todas as músicas da organização em cronogramas de cultos.
 * É cacheado por 60s e invalidado por alterações de músicas ou eventos.
 */
async function listSongUsageRows(organizationId: string): Promise<SongUsageRow[]> {
  const rows = await remember(
    `org:${organizationId}:songs:usage`,
    60,
    async () => {
      return db
        .select({
          songId: schema.eventPlanItem.songId,
          eventKind: schema.event.kind,
          itemId: schema.eventPlanItem.id,
          itemTitle: schema.eventPlanItem.title,
          eventId: schema.event.id,
          eventTitle: schema.event.title,
          startsAt: schema.event.startsAt,
          customResponsible: schema.eventPlanItem.customResponsible,
          personName: schema.person.name,
        })
        .from(schema.eventPlanItem)
        .innerJoin(
          schema.event,
          eq(schema.eventPlanItem.eventId, schema.event.id),
        )
        .leftJoin(
          schema.person,
          eq(schema.eventPlanItem.personId, schema.person.id),
        )
        .where(
          and(
            eq(schema.event.organizationId, organizationId),
            eq(schema.event.kind, "service"),
            isNotNull(schema.eventPlanItem.songId),
          ),
        )
        .orderBy(asc(schema.event.startsAt));
    },
    [`songs:${organizationId}`, `events:${organizationId}`],
  );

  return rows.flatMap((row) =>
    row.songId
      ? [
          {
            songId: row.songId,
            eventKind: row.eventKind,
            itemId: row.itemId,
            itemTitle: row.itemTitle,
            eventId: row.eventId,
            eventTitle: row.eventTitle,
            startsAt: row.startsAt,
            responsible:
              row.customResponsible?.trim() || row.personName?.trim() || null,
          },
        ]
      : [],
  );
}

async function getUsageMap(
  organizationId: string,
): Promise<Map<string, SongUsageSummary>> {
  return buildSongUsageMap(await listSongUsageRows(organizationId));
}

export async function listSongs(
  organizationId: string,
  search?: string,
): Promise<SongWithUsage[]> {
  const cleanSearch = search?.trim();
  const usageMap = await getUsageMap(organizationId);

  const songs = cleanSearch
    ? await db.query.song.findMany({
        where: and(
          eq(schema.song.organizationId, organizationId),
          or(
            ilike(schema.song.title, `%${cleanSearch}%`),
            ilike(schema.song.artist, `%${cleanSearch}%`),
            ilike(schema.song.tone, `%${cleanSearch}%`),
          ),
        ),
        orderBy: [asc(schema.song.title)],
      })
    : await remember(
        `org:${organizationId}:songs:all`,
        60,
        async () => {
          return db.query.song.findMany({
            where: eq(schema.song.organizationId, organizationId),
            orderBy: [asc(schema.song.title)],
          });
        },
        [`songs:${organizationId}`],
      );

  return songs.map((song) => ({
    ...song,
    usage: usageMap.get(song.id) ?? EMPTY_SONG_USAGE,
  }));
}

/**
 * Detalhes da música. Não é cacheado porque o histórico de cultos muda com
 * frequência; os dados básicos da listagem continuam cacheados.
 */
export async function getSong(organizationId: string, songId: string) {
  const song = await db.query.song.findFirst({
    where: and(
      eq(schema.song.id, songId),
      eq(schema.song.organizationId, organizationId),
    ),
  });

  if (!song) return null;

  const [usageMap, planItemRows] = await Promise.all([
    getUsageMap(organizationId),
    db
      .select({
        id: schema.eventPlanItem.id,
        title: schema.eventPlanItem.title,
        eventId: schema.event.id,
        eventTitle: schema.event.title,
        eventStartsAt: schema.event.startsAt,
        customResponsible: schema.eventPlanItem.customResponsible,
        personName: schema.person.name,
      })
      .from(schema.eventPlanItem)
      .innerJoin(
        schema.event,
        eq(schema.eventPlanItem.eventId, schema.event.id),
      )
      .leftJoin(
        schema.person,
        eq(schema.eventPlanItem.personId, schema.person.id),
      )
      .where(
        and(
          eq(schema.event.organizationId, organizationId),
          eq(schema.event.kind, "service"),
          eq(schema.eventPlanItem.songId, songId),
        ),
      )
      // Histórico por data do culto, não por data de criação do item.
      .orderBy(desc(schema.event.startsAt))
      .limit(8),
  ]);

  const planItems = planItemRows.map((row) => ({
    id: row.id,
    title: row.title,
    eventId: row.eventId,
    responsible:
      row.customResponsible?.trim() || row.personName?.trim() || null,
    event: {
      id: row.eventId,
      title: row.eventTitle,
      startsAt: row.eventStartsAt,
    },
  }));

  const usage = usageMap.get(songId) ?? EMPTY_SONG_USAGE;

  return { ...song, planItems, usage };
}

export async function getSongStats(organizationId: string) {
  const songs = await listSongs(organizationId);

  const total = songs.length;
  const withChords = songs.filter((s) => Boolean(s.chords?.trim())).length;
  const withLyrics = songs.filter((s) => Boolean(s.lyrics?.trim())).length;

  const artistMap = new Map<string, number>();
  for (const s of songs) {
    if (s.artist?.trim()) {
      const a = s.artist.trim();
      artistMap.set(a, (artistMap.get(a) ?? 0) + 1);
    }
  }

  const topArtists = Array.from(artistMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  return {
    total,
    withChords,
    withLyrics,
    topArtists,
  };
}

export async function listSongCollections(
  organizationId: string,
): Promise<string[]> {
  const songs = await listSongs(organizationId);
  const set = new Set<string>();
  for (const s of songs) {
    if (s.collection?.trim()) {
      set.add(s.collection.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function invalidateSongCache(
  organizationId: string,
  songId?: string,
) {
  const tags = [`songs:${organizationId}`];
  if (songId) {
    tags.push(`song:${songId}`);
  }
  await cacheInvalidateTags(...tags);
}

/**
 * Retorna o próximo evento da organização que ainda não tem esta música no
 * cronograma. Usado pelo atalho "adicionar ao próximo culto".
 */
export async function getNextEventForSong(
  organizationId: string,
  songId: string,
) {
  const now = new Date();
  const usedItems = await db.query.eventPlanItem.findMany({
    where: eq(schema.eventPlanItem.songId, songId),
    columns: { eventId: true },
  });
  const usedEventIds = Array.from(
    new Set(usedItems.map((item) => item.eventId)),
  );

  return db.query.event.findFirst({
    where:
      usedEventIds.length > 0
        ? and(
            eq(schema.event.organizationId, organizationId),
            eq(schema.event.kind, "service"),
            gte(schema.event.startsAt, now),
            notInArray(schema.event.id, usedEventIds),
          )
        : and(
            eq(schema.event.organizationId, organizationId),
            eq(schema.event.kind, "service"),
            gte(schema.event.startsAt, now),
          ),
    orderBy: [asc(schema.event.startsAt)],
    columns: { id: true, title: true, startsAt: true },
  });
}

export async function getNextPlanItemOrder(eventId: string) {
  const items = await db.query.eventPlanItem.findMany({
    where: eq(schema.eventPlanItem.eventId, eventId),
    columns: { order: true },
  });
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
}

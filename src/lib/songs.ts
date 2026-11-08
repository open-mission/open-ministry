import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import { isModuleActiveForUser } from "@/lib/modules/service";

export type SongRecord = typeof schema.song.$inferSelect;

export async function canAccessMusicModule(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
): Promise<boolean> {
  return isModuleActiveForUser(organizationId, userId, "music", isAdmin);
}

export async function listSongs(
  organizationId: string,
  search?: string,
): Promise<SongRecord[]> {
  const cleanSearch = search?.trim();

  if (cleanSearch) {
    const pattern = `%${cleanSearch}%`;
    return db.query.song.findMany({
      where: and(
        eq(schema.song.organizationId, organizationId),
        or(
          ilike(schema.song.title, pattern),
          ilike(schema.song.artist, pattern),
          ilike(schema.song.tone, pattern),
        ),
      ),
      orderBy: [asc(schema.song.title)],
    });
  }

  return remember(
    `org:${organizationId}:songs:all`,
    300,
    async () => {
      return db.query.song.findMany({
        where: eq(schema.song.organizationId, organizationId),
        orderBy: [asc(schema.song.title)],
      });
    },
    [`songs:${organizationId}`],
  );
}

export async function getSong(
  organizationId: string,
  songId: string,
) {
  return remember(
    `org:${organizationId}:song:${songId}`,
    300,
    async () => {
      return db.query.song.findFirst({
        where: and(
          eq(schema.song.id, songId),
          eq(schema.song.organizationId, organizationId),
        ),
        with: {
          createdBy: true,
          planItems: {
            with: {
              event: true,
            },
            limit: 5,
            orderBy: (items, { desc }) => [desc(items.createdAt)],
          },
        },
      });
    },
    [`songs:${organizationId}`, `song:${songId}`],
  );
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

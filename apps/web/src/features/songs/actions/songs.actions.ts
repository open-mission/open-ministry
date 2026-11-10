"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  fetchLyricsDetails,
  searchSongsOnline,
  type OnlineSongResult,
} from "@/lib/music/lyrics-service";
import { requireOrganizationContext } from "@/lib/organizations";
import { can, requirePermission } from "@/lib/permissions/service";
import { songInputSchema } from "@/lib/music/songs-schema";
import {
  invalidateSongCache,
  type SongRecord,
} from "@/lib/songs";

export type SongActionResult = {
  ok: boolean;
  error?: string;
  songId?: string;
  song?: SongRecord;
};

export async function searchOnlineSongsAction(
  query: string,
): Promise<OnlineSongResult[]> {
  await requireOrganizationContext();
  await requirePermission("music", "createSong");
  return searchSongsOnline(query);
}

export async function fetchLyricsDetailsAction(
  item: OnlineSongResult,
): Promise<string> {
  await requireOrganizationContext();
  await requirePermission("music", "createSong");
  return fetchLyricsDetails(item);
}

export async function createSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  const { organization, session } = await requireOrganizationContext();
  const allowed = await can("music", "createSong");
  if (!allowed) {
    return {
      ok: false,
      error: "Você não tem permissão para cadastrar músicas.",
    };
  }

  const rawTags = formData.get("tags");
  let parsedTags: string[] = [];
  if (typeof rawTags === "string" && rawTags.trim()) {
    try {
      parsedTags = JSON.parse(rawTags);
    } catch {
      parsedTags = rawTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  const parsed = songInputSchema.safeParse({
    title: formData.get("title"),
    artist: formData.get("artist") || null,
    tone: formData.get("tone") || null,
    bpm: formData.get("bpm") || null,
    timeSignature: formData.get("timeSignature") || null,
    lyrics: formData.get("lyrics") || null,
    chords: formData.get("chords") || null,
    youtubeUrl: formData.get("youtubeUrl") || null,
    youtubeMusicUrl: formData.get("youtubeMusicUrl") || null,
    spotifyUrl: formData.get("spotifyUrl") || null,
    collection: formData.get("collection") || null,
    tags: parsedTags,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    const id = crypto.randomUUID();
    const data = parsed.data;

    const [inserted] = await db
      .insert(schema.song)
      .values({
        id,
        organizationId: organization.id,
        title: data.title,
        artist: data.artist,
        tone: data.tone,
        bpm: data.bpm,
        timeSignature: data.timeSignature,
        lyrics: data.lyrics,
        chords: data.chords,
        youtubeUrl: data.youtubeUrl,
        youtubeMusicUrl: data.youtubeMusicUrl,
        spotifyUrl: data.spotifyUrl,
        collection: data.collection,
        tags: data.tags,
        createdById: session.user.id,
      })
      .returning();

    await invalidateSongCache(organization.id);

    revalidatePath("/dashboard/songs");
    revalidatePath("/dashboard/events");

    return { ok: true, songId: id, song: inserted };
  } catch (err) {
    console.error("[createSongAction] Erro ao cadastrar música:", err);
    return { ok: false, error: "Não foi possível cadastrar a música." };
  }
}

export async function updateSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  const { organization } = await requireOrganizationContext();
  const allowed = await can("music", "updateSong");
  if (!allowed) {
    return {
      ok: false,
      error: "Você não tem permissão para editar músicas.",
    };
  }

  const songId = formData.get("songId");
  if (typeof songId !== "string" || !songId) {
    return { ok: false, error: "Música inválida." };
  }

  const rawTags = formData.get("tags");
  let parsedTags: string[] = [];
  if (typeof rawTags === "string" && rawTags.trim()) {
    try {
      parsedTags = JSON.parse(rawTags);
    } catch {
      parsedTags = rawTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  const parsed = songInputSchema.safeParse({
    title: formData.get("title"),
    artist: formData.get("artist") || null,
    tone: formData.get("tone") || null,
    bpm: formData.get("bpm") || null,
    timeSignature: formData.get("timeSignature") || null,
    lyrics: formData.get("lyrics") || null,
    chords: formData.get("chords") || null,
    youtubeUrl: formData.get("youtubeUrl") || null,
    youtubeMusicUrl: formData.get("youtubeMusicUrl") || null,
    spotifyUrl: formData.get("spotifyUrl") || null,
    collection: formData.get("collection") || null,
    tags: parsedTags,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    const data = parsed.data;

    const [updated] = await db
      .update(schema.song)
      .set({
        title: data.title,
        artist: data.artist,
        tone: data.tone,
        bpm: data.bpm,
        timeSignature: data.timeSignature,
        lyrics: data.lyrics,
        chords: data.chords,
        youtubeUrl: data.youtubeUrl,
        youtubeMusicUrl: data.youtubeMusicUrl,
        spotifyUrl: data.spotifyUrl,
        collection: data.collection,
        tags: data.tags,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.song.id, songId),
          eq(schema.song.organizationId, organization.id),
        ),
      )
      .returning();

    await invalidateSongCache(organization.id, songId);

    revalidatePath("/dashboard/songs");
    revalidatePath(`/dashboard/songs/${songId}`);
    revalidatePath("/dashboard/events");

    return { ok: true, songId, song: updated };
  } catch (err) {
    console.error("[updateSongAction] Erro ao editar música:", err);
    return { ok: false, error: "Não foi possível atualizar a música." };
  }
}

export async function deleteSongAction(
  input: FormData | string,
): Promise<SongActionResult> {
  const { organization } = await requireOrganizationContext();
  const allowed = await can("music", "deleteSong");
  if (!allowed) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir músicas.",
    };
  }

  const songId = typeof input === "string" ? input : input.get("songId");
  if (typeof songId !== "string" || !songId) {
    return { ok: false, error: "Música inválida." };
  }

  try {
    await db
      .delete(schema.song)
      .where(
        and(
          eq(schema.song.id, songId),
          eq(schema.song.organizationId, organization.id),
        ),
      );

    await invalidateSongCache(organization.id, songId);

    revalidatePath("/dashboard/songs");
    revalidatePath("/dashboard/events");

    return { ok: true };
  } catch (err) {
    console.error("[deleteSongAction] Erro ao excluir música:", err);
    return { ok: false, error: "Não foi possível excluir a música." };
  }
}

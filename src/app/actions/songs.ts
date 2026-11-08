"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  fetchLyricsDetails,
  searchSongsOnline,
  type OnlineSongResult,
} from "@/lib/music/lyrics-service";
import { requireOrganizationContext } from "@/lib/organizations";
import { canAccessMusicModule, invalidateSongCache } from "@/lib/songs";

const songInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da música é obrigatório.")
    .max(160, "O título deve ter no máximo 160 caracteres."),
  artist: z.string().trim().max(120).optional().nullable(),
  tone: z.string().trim().max(10).optional().nullable(),
  bpm: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(20).max(300).nullable().optional(),
    ),
  timeSignature: z.string().trim().max(10).optional().nullable(),
  lyrics: z.string().trim().max(20000).optional().nullable(),
  chords: z.string().trim().max(30000).optional().nullable(),
  youtubeUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
      "Link do YouTube inválido.",
    ),
  youtubeMusicUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
      "Link do YouTube Music inválido.",
    ),
  spotifyUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
      "Link do Spotify inválido.",
    ),
  collection: z.string().trim().max(100).optional().nullable(),
  tags: z
    .array(z.string().trim())
    .optional()
    .default([]),
});

export type SongActionResult = {
  ok: boolean;
  error?: string;
  songId?: string;
};

export async function searchOnlineSongsAction(
  query: string,
): Promise<OnlineSongResult[]> {
  const { organization, session, isAdmin } = await requireOrganizationContext();
  const hasAccess = await canAccessMusicModule(
    organization.id,
    session.user.id,
    isAdmin,
  );
  if (!hasAccess) {
    throw new Error("Módulo de música não liberado para seu perfil.");
  }

  return searchSongsOnline(query);
}

export async function fetchLyricsDetailsAction(
  item: OnlineSongResult,
): Promise<string> {
  const { organization, session, isAdmin } = await requireOrganizationContext();
  const hasAccess = await canAccessMusicModule(
    organization.id,
    session.user.id,
    isAdmin,
  );
  if (!hasAccess) {
    throw new Error("Módulo de música não liberado para seu perfil.");
  }

  return fetchLyricsDetails(item);
}

export async function createSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  const { organization, session, isAdmin } = await requireOrganizationContext();
  const hasAccess = await canAccessMusicModule(
    organization.id,
    session.user.id,
    isAdmin,
  );
  if (!hasAccess) {
    return {
      ok: false,
      error: "O módulo de música não está ativo para seu perfil ou departamento.",
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

    await db.insert(schema.song).values({
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
    });

    await invalidateSongCache(organization.id);

    revalidatePath("/dashboard/songs");
    revalidatePath("/dashboard/events");

    return { ok: true, songId: id };
  } catch (err) {
    console.error("[createSongAction] Erro ao cadastrar música:", err);
    return { ok: false, error: "Não foi possível cadastrar a música." };
  }
}

export async function updateSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  const { organization, session, isAdmin } = await requireOrganizationContext();
  const hasAccess = await canAccessMusicModule(
    organization.id,
    session.user.id,
    isAdmin,
  );
  if (!hasAccess) {
    return {
      ok: false,
      error: "O módulo de música não está ativo para seu perfil ou departamento.",
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

    await db
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
      );

    await invalidateSongCache(organization.id, songId);

    revalidatePath("/dashboard/songs");
    revalidatePath(`/dashboard/songs/${songId}`);
    revalidatePath("/dashboard/events");

    return { ok: true, songId };
  } catch (err) {
    console.error("[updateSongAction] Erro ao editar música:", err);
    return { ok: false, error: "Não foi possível atualizar a música." };
  }
}

export async function deleteSongAction(
  formData: FormData,
): Promise<SongActionResult> {
  const { organization, session, isAdmin } = await requireOrganizationContext();
  const hasAccess = await canAccessMusicModule(
    organization.id,
    session.user.id,
    isAdmin,
  );
  if (!hasAccess) {
    return {
      ok: false,
      error: "O módulo de música não está ativo para seu perfil ou departamento.",
    };
  }

  const songId = formData.get("songId");
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

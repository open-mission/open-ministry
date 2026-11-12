import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { songInputSchema } from "@/lib/music/songs-schema";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { getSong, invalidateSongCache } from "@/lib/songs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  await connection();

  try {
    const { songId } = await params;
    const { organization } = await requireOrganizationContext();

    const allowed = await can("music", "read");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para acessar esta música." },
        { status: 403 },
      );
    }

    const song = await getSong(organization.id, songId);
    if (!song) {
      return Response.json(
        { error: "Música não encontrada." },
        { status: 404 },
      );
    }

    return Response.json({ song });
  } catch (error) {
    console.error("[GET /api/songs/[songId]] Erro ao buscar música:", error);
    return Response.json(
      { error: "Não foi possível carregar a música." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  await connection();

  try {
    const { songId } = await params;
    const { organization } = await requireOrganizationContext();

    const allowed = await can("music", "updateSong");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para editar músicas." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = songInputSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message ?? "Dados da música inválidos.",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const [updated] = await db
      .update(schema.song)
      .set({
        title: data.title,
        artist: data.artist,
        tone: data.tone,
        capo: data.capo,
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

    if (!updated) {
      return Response.json(
        { error: "Música não encontrada para atualização." },
        { status: 404 },
      );
    }

    await invalidateSongCache(organization.id, songId);

    revalidatePath("/dashboard/songs");
    revalidatePath(`/dashboard/songs/${songId}`);
    revalidatePath("/dashboard/events");

    // Recarregar os relacionamentos (histórico de cultos e uso)
    const refreshedSong = await getSong(organization.id, songId);

    return Response.json({ song: refreshedSong ?? updated });
  } catch (error) {
    console.error("[PATCH /api/songs/[songId]] Erro ao atualizar música:", error);
    return Response.json(
      { error: "Não foi possível atualizar a música." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  await connection();

  try {
    const { songId } = await params;
    const { organization } = await requireOrganizationContext();

    const allowed = await can("music", "deleteSong");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para excluir músicas." },
        { status: 403 },
      );
    }

    const deleted = await db
      .delete(schema.song)
      .where(
        and(
          eq(schema.song.id, songId),
          eq(schema.song.organizationId, organization.id),
        ),
      )
      .returning({ id: schema.song.id });

    if (!deleted.length) {
      return Response.json(
        { error: "Música não encontrada." },
        { status: 404 },
      );
    }

    await invalidateSongCache(organization.id, songId);

    revalidatePath("/dashboard/songs");
    revalidatePath("/dashboard/events");

    return Response.json({ ok: true, songId });
  } catch (error) {
    console.error("[DELETE /api/songs/[songId]] Erro ao excluir música:", error);
    return Response.json(
      { error: "Não foi possível excluir a música." },
      { status: 500 },
    );
  }
}

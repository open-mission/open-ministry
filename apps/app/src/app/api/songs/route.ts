import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { songInputSchema } from "@/lib/music/songs-schema";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import {
  invalidateSongCache,
  listSongCollections,
  listSongs,
} from "@/lib/songs";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const { organization } = await requireOrganizationContext();
    const allowed = await can("music", "read");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para acessar o módulo de músicas." },
        { status: 403 },
      );
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? undefined;

    const [songs, collections] = await Promise.all([
      listSongs(organization.id, search),
      listSongCollections(organization.id),
    ]);

    return Response.json({ songs, collections });
  } catch (error) {
    console.error("[GET /api/songs] Erro ao listar músicas:", error);
    return Response.json(
      { error: "Não foi possível carregar as músicas." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    const { organization, session } = await requireOrganizationContext();
    const allowed = await can("music", "createSong");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para cadastrar músicas." },
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
    const id = crypto.randomUUID();

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

    return Response.json({ song: inserted }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/songs] Erro ao criar música:", error);
    return Response.json(
      { error: "Não foi possível cadastrar a música." },
      { status: 500 },
    );
  }
}

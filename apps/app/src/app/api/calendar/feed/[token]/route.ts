import { createHash } from "node:crypto";

import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { loadPersonalCalendarFeed } from "@/features/calendar/services/personal-feed";

const NOT_FOUND_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

/**
 * Feed pessoal de calendário. Sem sessão e sem cookie: o token no caminho é a
 * credencial, do mesmo jeito que um link privado de calendário. Token inválido,
 * desconhecido ou revogado devolve o mesmo 404, para não confirmar quais links
 * já existiram.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  await connection();

  const { token } = await context.params;

  try {
    const feed = await loadPersonalCalendarFeed(token);

    if (!feed) {
      return new Response("Calendário não encontrado.", {
        status: 404,
        headers: NOT_FOUND_HEADERS,
      });
    }

    const etag = `"${createHash("sha256").update(feed.ics).digest("hex")}"`;
    const headers = {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="${feed.fileName}"`,
      "cache-control": "private, max-age=300",
      etag,
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    };

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch) {
      const candidates = ifNoneMatch.split(",").map((value) => value.trim());
      if (candidates.includes(etag) || candidates.includes("*")) {
        return new Response(null, { status: 304, headers });
      }
    }

    return new Response(feed.ics, { status: 200, headers });
  } catch (error) {
    console.error("[GET /api/calendar/feed] Erro:", error);
    return new Response("Não foi possível gerar o calendário.", {
      status: 500,
      headers: NOT_FOUND_HEADERS,
    });
  }
}

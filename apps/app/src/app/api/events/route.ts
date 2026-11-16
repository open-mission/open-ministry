import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { listEvents, splitEvents } from "@/lib/events";
import { can } from "@/lib/permissions/service";

export async function GET(_request: NextRequest) {
  await connection();

  try {
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const { organization } = auth.context;
    const allowed = await can("agenda", "read");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para acessar os eventos." },
        { status: 403 },
      );
    }

    const events = await listEvents(organization.id);
    const { upcoming, past } = splitEvents(events);

    return Response.json({ events, upcoming, past });
  } catch (error) {
    console.error("[GET /api/events] Erro ao listar eventos:", error);
    return Response.json(
      { error: "Não foi possível carregar os eventos." },
      { status: 500 },
    );
  }
}

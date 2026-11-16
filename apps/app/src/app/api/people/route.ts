import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { listPeople } from "@/lib/people";

export async function GET(_request: NextRequest) {
  await connection();

  try {
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const { organization } = auth.context;
    const people = await listPeople(organization.id);

    return Response.json({ people });
  } catch (error) {
    console.error("[GET /api/people] Erro ao listar pessoas:", error);
    return Response.json(
      { error: "Não foi possível carregar as pessoas." },
      { status: 500 },
    );
  }
}

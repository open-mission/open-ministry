import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";

export async function GET(_request: NextRequest) {
  await connection();

  try {
    const { organization } = await requireOrganizationContext();
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

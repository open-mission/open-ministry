import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { listDepartments } from "@/lib/departments";

export async function GET(_request: NextRequest) {
  await connection();

  try {
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const { organization } = auth.context;
    const departments = await listDepartments(organization.id);

    return Response.json({ departments });
  } catch (error) {
    console.error("[GET /api/departments] Erro ao listar departamentos:", error);
    return Response.json(
      { error: "Não foi possível carregar os departamentos." },
      { status: 500 },
    );
  }
}

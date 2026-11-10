import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { listDepartments } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";

export async function GET(_request: NextRequest) {
  await connection();

  try {
    const { organization } = await requireOrganizationContext();
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

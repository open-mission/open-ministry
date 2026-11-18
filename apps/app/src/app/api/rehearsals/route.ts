import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { can } from "@/lib/permissions/service";
import {
  getAccessibleRehearsalDepartments,
  listAccessibleRehearsals,
} from "@/features/rehearsals/services/rehearsals-global-service";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "read");
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para visualizar os ensaios." },
        { status: 403 },
      );
    }

    const organizationId = auth.context.organization.id;
    const departments = await getAccessibleRehearsalDepartments(organizationId);
    const departmentId =
      request.nextUrl.searchParams.get("departmentId")?.trim() || undefined;

    if (
      departmentId &&
      !departments.some((department) => department.id === departmentId)
    ) {
      return Response.json(
        { error: "Você não tem permissão para visualizar os ensaios." },
        { status: 403 },
      );
    }

    const rehearsals = await listAccessibleRehearsals(
      organizationId,
      departmentId ? [departmentId] : departments.map((item) => item.id),
    );

    return Response.json({ rehearsals, departments });
  } catch (error) {
    console.error("[GET /api/rehearsals] Erro:", error);
    return Response.json(
      { error: "Não foi possível carregar os ensaios." },
      { status: 500 },
    );
  }
}

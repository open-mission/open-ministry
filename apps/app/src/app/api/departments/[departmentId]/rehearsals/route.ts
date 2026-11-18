import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { can } from "@/lib/permissions/service";
import {
  createRehearsal,
  createRehearsalSchema,
  listDepartmentRehearsals,
} from "@/features/rehearsals/services/rehearsals-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  await connection();

  try {
    const { departmentId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "read", { departmentId });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para visualizar os ensaios." },
        { status: 403 },
      );
    }

    const rehearsals = await listDepartmentRehearsals(
      auth.context.organization.id,
      departmentId,
    );

    return Response.json({ rehearsals });
  } catch (error) {
    console.error(
      "[GET /api/departments/[departmentId]/rehearsals] Erro:",
      error,
    );
    return Response.json(
      { error: "Não foi possível carregar os ensaios." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  await connection();

  try {
    const { departmentId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "createRehearsal", {
      departmentId,
    });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para agendar ensaios." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createRehearsalSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Dados do ensaio inválidos.",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const rehearsal = await createRehearsal(
      auth.context.organization.id,
      departmentId,
      parsed.data,
    );

    return Response.json({ rehearsal }, { status: 201 });
  } catch (error) {
    console.error(
      "[POST /api/departments/[departmentId]/rehearsals] Erro:",
      error,
    );
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível agendar o ensaio.",
      },
      { status: 500 },
    );
  }
}

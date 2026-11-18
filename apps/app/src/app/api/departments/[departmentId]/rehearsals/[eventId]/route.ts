import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { can } from "@/lib/permissions/service";
import {
  deleteRehearsal,
  getRehearsalById,
  updateRehearsal,
  updateRehearsalSchema,
} from "@/features/rehearsals/services/rehearsals-service";

type RouteParams = { params: Promise<{ departmentId: string; eventId: string }> };

async function loadRehearsalForDepartment(
  organizationId: string,
  departmentId: string,
  eventId: string,
) {
  const rehearsal = await getRehearsalById(organizationId, eventId);
  if (!rehearsal) {
    return { error: "Ensaio não encontrado.", status: 404 as const };
  }

  const belongs = rehearsal.departments.some(
    (item) => item.departmentId === departmentId,
  );
  if (!belongs) {
    return {
      error: "Este ensaio não pertence ao departamento informado.",
      status: 404 as const,
    };
  }

  return { rehearsal };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  await connection();

  try {
    const { departmentId, eventId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "read", { departmentId });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para visualizar este ensaio." },
        { status: 403 },
      );
    }

    const result = await loadRehearsalForDepartment(
      auth.context.organization.id,
      departmentId,
      eventId,
    );
    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ rehearsal: result.rehearsal });
  } catch (error) {
    console.error(
      "[GET /api/departments/[departmentId]/rehearsals/[eventId]] Erro:",
      error,
    );
    return Response.json(
      { error: "Não foi possível carregar o ensaio." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  await connection();

  try {
    const { departmentId, eventId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "updateRehearsal", {
      departmentId,
    });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para editar este ensaio." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateRehearsalSchema.safeParse(body);

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

    const rehearsal = await updateRehearsal(
      auth.context.organization.id,
      departmentId,
      eventId,
      parsed.data,
    );

    return Response.json({ rehearsal });
  } catch (error) {
    console.error(
      "[PATCH /api/departments/[departmentId]/rehearsals/[eventId]] Erro:",
      error,
    );
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o ensaio.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  await connection();

  try {
    const { departmentId, eventId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "deleteRehearsal", {
      departmentId,
    });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para excluir este ensaio." },
        { status: 403 },
      );
    }

    await deleteRehearsal(
      auth.context.organization.id,
      departmentId,
      eventId,
    );

    return Response.json({ ok: true, eventId });
  } catch (error) {
    console.error(
      "[DELETE /api/departments/[departmentId]/rehearsals/[eventId]] Erro:",
      error,
    );
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o ensaio.",
      },
      { status: 500 },
    );
  }
}

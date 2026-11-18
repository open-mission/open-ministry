import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { requireApiOrganizationContext } from "@/lib/api-auth";
import { can } from "@/lib/permissions/service";
import {
  getOrSeedDepartmentAlertRules,
  resetDepartmentAlertRules,
  saveDepartmentAlertRules,
  saveRehearsalAlertRulesSchema,
} from "@/features/rehearsals/services/rehearsals-service";

type RouteParams = { params: Promise<{ departmentId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  await connection();

  try {
    const { departmentId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "read", { departmentId });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para visualizar os lembretes." },
        { status: 403 },
      );
    }

    const rules = await getOrSeedDepartmentAlertRules(
      auth.context.organization.id,
      departmentId,
    );

    return Response.json({ rules });
  } catch (error) {
    console.error(
      "[GET /api/departments/[departmentId]/rehearsals/alerts] Erro:",
      error,
    );
    return Response.json(
      { error: "Não foi possível carregar os lembretes." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  await connection();

  try {
    const { departmentId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "manageAlerts", { departmentId });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para configurar os lembretes." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const payload = Array.isArray(body) ? { rules: body } : body;
    const parsed = saveRehearsalAlertRulesSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Regras de lembrete inválidas.",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const rules = await saveDepartmentAlertRules(
      auth.context.organization.id,
      departmentId,
      parsed.data.rules,
    );

    return Response.json({ rules });
  } catch (error) {
    console.error(
      "[PUT /api/departments/[departmentId]/rehearsals/alerts] Erro:",
      error,
    );
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar os lembretes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  await connection();

  try {
    const { departmentId } = await params;
    const auth = await requireApiOrganizationContext();
    if (!auth.ok) return auth.response;

    const allowed = await can("rehearsals", "manageAlerts", { departmentId });
    if (!allowed) {
      return Response.json(
        { error: "Você não tem permissão para restaurar os lembretes." },
        { status: 403 },
      );
    }

    const rules = await resetDepartmentAlertRules(
      auth.context.organization.id,
      departmentId,
    );

    return Response.json({ rules });
  } catch (error) {
    console.error(
      "[POST /api/departments/[departmentId]/rehearsals/alerts] Erro:",
      error,
    );
    return Response.json(
      { error: "Não foi possível restaurar os lembretes." },
      { status: 500 },
    );
  }
}

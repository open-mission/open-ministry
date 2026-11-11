import { connection } from "next/server";
import type { NextRequest } from "next/server";

import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { listEvolutionMessageLogs } from "@/lib/notification-service";
import { getOrganizationContext } from "@/lib/organizations";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const context = await getOrganizationContext();
    if (!context) {
      return Response.json(
        { error: "Sua sessão expirou." },
        { status: 401 },
      );
    }

    const isLeader = !context.isAdmin
      ? await isUserLeaderInAnyDepartment(
          context.organization.id,
          context.session.user.id,
        )
      : false;

    if (!context.isAdmin && !isLeader) {
      return Response.json(
        {
          error:
            "Apenas administradores ou líderes de departamento podem acessar os registros.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 50, 1),
      100,
    );
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "all";
    const search = searchParams.get("search") || "";
    const batchId = searchParams.get("batchId") || undefined;

    const data = await listEvolutionMessageLogs(context.organization.id, {
      limit,
      offset,
      status,
      type,
      search,
      batchId,
    });

    return Response.json(data);
  } catch (error) {
    console.error("[GET /api/whatsapp/logs] Erro ao listar logs:", error);
    return Response.json(
      { error: "Não foi possível carregar o histórico de mensagens." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { verifyQueueEndpointAuth } from "@/lib/queue";
import { sendWebPushToUser } from "@/lib/push-notifications";
import { getTodayDateString } from "@/lib/felicitometro-types";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // Falhe fechado: apenas assinatura QStash válida (ou CRON_SECRET) dispara o
    // job. O fallback de sessão anterior deixava qualquer membro disparar push
    // em massa para a igreja inteira.
    const auth = await verifyQueueEndpointAuth(req, rawBody);
    if (!auth.ok) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 },
      );
    }

    let targetOrgId: string | undefined;
    if (rawBody.trim()) {
      try {
        const parsed = JSON.parse(rawBody);
        targetOrgId = parsed.organizationId;
      } catch {
        // Body não é JSON
      }
    }

    const today = getTodayDateString();
    let totalSent = 0;
    let totalTargeted = 0;

    // Buscar organizações alvo
    const orgs = await db.query.organization.findMany({
      where: targetOrgId ? eq(schema.organization.id, targetOrgId) : undefined,
      with: {
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    for (const org of orgs) {
      // Pessoas que já responderam hoje na organização
      const answeredToday = await db.query.personMood.findMany({
        where: and(
          eq(schema.personMood.organizationId, org.id),
          eq(schema.personMood.date, today),
        ),
        columns: {
          personId: true,
          userId: true,
        },
      });

      const answeredUserIds = new Set(
        answeredToday
          .map((m) => m.userId)
          .filter((id): id is string => Boolean(id)),
      );

      // Usuários da organização que ainda NÃO responderam hoje
      const pendingUsers = org.members
        .map((m) => m.user)
        .filter((u) => Boolean(u?.id) && !answeredUserIds.has(u.id));

      if (pendingUsers.length === 0) continue;

      totalTargeted += pendingUsers.length;

      for (const u of pendingUsers) {
        if (!u?.id) continue;

        // Dispara push notification
        try {
          const pushResult = await sendWebPushToUser(u.id, {
            title: "Como você está hoje? ☀️",
            body: "Compartilhe com a liderança como está o seu coração no Felicitômetro.",
            url: "/dashboard",
          });

          if (pushResult.sentCount > 0) {
            totalSent += pushResult.sentCount;
          }
        } catch {
          // Continua para o próximo usuário
        }
      }
    }

    return NextResponse.json({
      success: true,
      today,
      organizationsProcessed: orgs.length,
      totalTargeted,
      totalPushSent: totalSent,
    });
  } catch (error) {
    console.error("[felicitometro-job] Erro ao disparar notificações:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar automação do felicitômetro" },
      { status: 500 },
    );
  }
}

export async function GET() {
  // GET não dispara o job: agendamento usa POST assinado.
  return NextResponse.json({ error: "Método não permitido" }, { status: 405 });
}

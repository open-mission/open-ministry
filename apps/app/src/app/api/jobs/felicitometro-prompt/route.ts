import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getQStashReceiver } from "@/lib/queue";
import { sendWebPushToUser } from "@/lib/push-notifications";
import { getTodayDateString } from "@/lib/felicitometro-types";
import { getSession } from "@/lib/session";

async function verifyAuth(req: Request, rawBody: string): Promise<boolean> {
  const receiver = getQStashReceiver();
  if (receiver) {
    const signature = req.headers.get("upstash-signature");
    if (signature) {
      const isValid = await receiver.verify({
        signature,
        body: rawBody,
        url: req.url,
      });
      if (isValid) return true;
    }
  }

  // Verificar Authorization Bearer CRON_SECRET se configurado
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Ou verificar sessão de administrador
  try {
    const session = await getSession();
    if (session?.user) {
      return true;
    }
  } catch {
    // Ignora erro de sessão
  }

  // Em desenvolvimento local sem chaves configuradas, permite execução
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const isAuthorized = await verifyAuth(req, rawBody);

    if (!isAuthorized) {
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

export async function GET(req: Request) {
  return POST(req);
}

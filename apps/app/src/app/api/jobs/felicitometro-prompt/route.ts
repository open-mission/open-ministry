import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getTodayDateString } from "@/lib/felicitometro-types";
import { sendWebPushToUser } from "@/lib/push-notifications";
import { getRedisClient, verifyQueueEndpointAuth } from "@/lib/queue";
import { sentryLogger } from "@/lib/telemetry/sentry";

const BATCH_SIZE = 10;
const DEDUPE_TTL_SECONDS = 24 * 60 * 60;

type RedisClient = ReturnType<typeof getRedisClient>;

type PromptOutcome =
  | { kind: "skipped" }
  | { kind: "no_delivery" }
  | { kind: "sent"; sentCount: number; errors: number };

function buildPromptDedupeKey(
  today: string,
  organizationId: string,
  userId: string,
) {
  return `felicitometro:prompt:${today}:${organizationId}:${userId}`;
}

/**
 * Verifica se o lembrete já foi enviado hoje. Falha aberta: se o Redis estiver
 * indisponível, o envio segue (evita perder o lembrete por causa do cache).
 */
async function wasPromptAlreadySent(
  redis: RedisClient,
  key: string,
): Promise<boolean> {
  if (!redis) return false;

  try {
    return Boolean(await redis.get(key));
  } catch (error) {
    console.warn(
      "[felicitometro-job] Falha ao ler a deduplicação do Redis; seguindo sem ela.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return false;
  }
}

async function markPromptAsSent(redis: RedisClient, key: string) {
  if (!redis) return;

  try {
    await redis.set(key, "1", { ex: DEDUPE_TTL_SECONDS });
  } catch (error) {
    console.warn(
      "[felicitometro-job] Falha ao gravar a deduplicação no Redis.",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

async function sendPromptToUser(
  redis: RedisClient,
  today: string,
  organizationId: string,
  userId: string | null | undefined,
): Promise<PromptOutcome> {
  if (!userId) return { kind: "skipped" };

  const dedupeKey = buildPromptDedupeKey(today, organizationId, userId);

  if (await wasPromptAlreadySent(redis, dedupeKey)) {
    return { kind: "skipped" };
  }

  const pushResult = await sendWebPushToUser(userId, {
    title: "Como você está hoje? ☀️",
    body: "Compartilhe com a liderança como está o seu coração no Felicitômetro.",
    url: "/dashboard",
  });

  if (pushResult.sentCount > 0) {
    await markPromptAsSent(redis, dedupeKey);
    return {
      kind: "sent",
      sentCount: pushResult.sentCount,
      errors: pushResult.errors,
    };
  }

  return { kind: "no_delivery" };
}

export async function POST(req: Request) {
  try {
    sentryLogger.setScopeContext({ job: "felicitometro-prompt" });

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
    const redis = getRedisClient();

    let totalTargeted = 0;
    let totalSkipped = 0;
    let totalPushSent = 0;
    let totalErrors = 0;

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

      // Processa em lotes para não segurar a função por muito tempo em
      // organizações grandes, mantendo paralelismo controlado.
      for (let start = 0; start < pendingUsers.length; start += BATCH_SIZE) {
        const batch = pendingUsers.slice(start, start + BATCH_SIZE);
        const settled = await Promise.allSettled(
          batch.map((user) =>
            sendPromptToUser(redis, today, org.id, user?.id),
          ),
        );

        settled.forEach((result, index) => {
          const userId = batch[index]?.id;

          if (result.status === "rejected") {
            totalErrors++;
            const errorName =
              result.reason instanceof Error
                ? result.reason.name
                : "UnknownError";
            console.error(
              "[felicitometro-job] Falha ao processar usuário:",
              { organizationId: org.id, userId, errorName },
            );
            sentryLogger.error(
              "Falha ao processar usuário do felicitômetro",
              { organizationId: org.id, userId, errorName },
            );
            return;
          }

          const outcome = result.value;

          if (outcome.kind === "skipped") {
            totalSkipped++;
            return;
          }

          if (outcome.kind === "no_delivery") {
            return;
          }

          totalPushSent += outcome.sentCount;

          if (outcome.errors > 0) {
            totalErrors += outcome.errors;
            console.error(
              "[felicitometro-job] Push parcialmente entregue:",
              { organizationId: org.id, userId, errors: outcome.errors },
            );
            sentryLogger.error("Entrega parcial de push no felicitômetro", {
              organizationId: org.id,
              userId,
              errors: outcome.errors,
            });
          }
        });
      }
    }

    sentryLogger.info("[felicitometro-job] Resumo do disparo diário", {
      today,
      organizationsProcessed: orgs.length,
      totalTargeted,
      totalSkipped,
      totalPushSent,
      totalErrors,
    });

    return NextResponse.json({
      success: true,
      today,
      organizationsProcessed: orgs.length,
      totalTargeted,
      totalSkipped,
      totalPushSent,
      totalErrors,
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

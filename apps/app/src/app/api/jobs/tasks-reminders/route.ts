import { NextResponse } from "next/server";
import { and, inArray, or, sql } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { parseRecurrenceRule } from "@/features/tasks/lib/task-helpers";
import { verifyQueueEndpointAuth } from "@/lib/queue";
import { dispatchNotification } from "@/lib/notification-service";
import { sentryLogger } from "@/lib/telemetry/sentry";

const SAO_PAULO_TZ = "America/Sao_Paulo";

function getSaoPauloClock(now: Date = new Date()): {
  weekday: string;
  hour: number;
  todayStart: Date;
  todayEnd: Date;
} {
  const spParts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const part = (type: string) =>
    spParts.find((p) => p.type === type)?.value ?? "00";

  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const hourRaw = Number(part("hour"));
  const hour = hourRaw === 24 ? 0 : hourRaw;

  const weekdayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = String(weekdayDate.getUTCDay());

  // Converte meia-noite de Brasília para instante UTC preservando offset real
  const spAsLocal = new Date(
    now.toLocaleString("en-US", { timeZone: SAO_PAULO_TZ }),
  );
  const offsetMs = spAsLocal.getTime() - now.getTime();
  const todayStart = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs,
  );
  const todayEnd = new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs,
  );

  return { weekday, hour, todayStart, todayEnd };
}

export async function POST(req: Request) {
  return handleTasksReminders(req);
}

export async function GET() {
  // GET não pode disparar efeitos colaterais; o agendamento usa POST assinado.
  return NextResponse.json({ error: "Método não permitido" }, { status: 405 });
}

async function handleTasksReminders(req: Request) {
  try {
    // Falhe fechado: sem assinatura válida (ou CRON_SECRET) o job não roda.
    const rawBody = await req.text();
    const auth = await verifyQueueEndpointAuth(req, rawBody);
    if (!auth.ok) {
      return NextResponse.json(
        { error: `Assinatura QStash inválida (${auth.reason})` },
        { status: 401 },
      );
    }

    sentryLogger.setScopeContext({
      job: "tasks-reminders",
    });

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode"); // "daily" ignora filtro estrito por hora
    const { weekday, hour, todayStart, todayEnd } = getSaoPauloClock();

    // 1. Buscar tarefas ativas (todo ou in_progress) com data ou recorrência
    const candidateTasks = await db.query.task.findMany({
      where: and(
        inArray(schema.task.status, ["todo", "in_progress"]),
        or(
          sql`${schema.task.isRecurring} = true`,
          and(
            sql`${schema.task.date} >= ${todayStart}`,
            sql`${schema.task.date} <= ${todayEnd}`,
          ),
          and(
            sql`${schema.task.deadline} >= ${todayStart}`,
            sql`${schema.task.deadline} <= ${todayEnd}`,
          ),
        ),
      ),
      with: {
        organization: true,
      },
      limit: 200,
    });

    let sentCount = 0;

    for (const task of candidateTasks) {
      const targetUserId = task.assigneeId ?? task.createdById;
      if (!targetUserId) continue;

      let shouldRemind = false;
      let reminderReason = "Lembrete de tarefa";

      if (task.isRecurring) {
        const parsed = parseRecurrenceRule(task.recurrenceRule);
        const ruleText = task.recurrenceRule ?? "";
        const dayMatches =
          !ruleText.includes("BYDAY") || parsed.day === weekday;
        const targetHour = Number(parsed.time.split(":")[0] ?? "9");
        const timeMatches =
          mode === "daily" ||
          !ruleText.includes("BYTIME") ||
          targetHour === hour;

        if (dayMatches && timeMatches) {
          shouldRemind = true;
          reminderReason = ruleText.includes("BYTIME")
            ? `Lembrete semanal (${parsed.time})`
            : "Lembrete recorrente";
        }
      } else if (
        task.date &&
        task.date >= todayStart &&
        task.date <= todayEnd
      ) {
        shouldRemind = true;
        reminderReason = "Planejado para hoje";
      } else if (
        task.deadline &&
        task.deadline >= todayStart &&
        task.deadline <= todayEnd
      ) {
        shouldRemind = true;
        reminderReason = "Prazo limite é hoje";
      }

      if (shouldRemind) {
        const tab = task.scope === "personal" ? "personal" : "department";
        await dispatchNotification({
          organizationId: task.organizationId,
          type: "assignment",
          title: `${reminderReason}: ${task.title}`,
          body:
            task.description ||
            "Você tem uma tarefa agendada no OpenMinistry.",
          href: `/dashboard/tasks?tab=${tab}&taskId=${encodeURIComponent(task.id)}`,
          userId: targetUserId,
          personId: task.assigneePersonId ?? undefined,
          channels: ["in_app", "push"],
        }).catch((err) => {
          sentryLogger.warn("Falha no disparo do lembrete de tarefa", {
            taskId: task.id,
            error: String(err),
          });
        });

        sentCount++;
      }
    }

    sentryLogger.info(`Lembretes de tarefas processados com sucesso`, {
      processedCount: candidateTasks.length,
      sentCount,
    });

    return NextResponse.json({
      success: true,
      processed: candidateTasks.length,
      sent: sentCount,
    });
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      job: "tasks-reminders",
    });
    return NextResponse.json(
      { error: "Erro interno ao processar lembretes de tarefas." },
      { status: 500 },
    );
  }
}

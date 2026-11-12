import { NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getQStashReceiver } from "@/lib/queue";
import { dispatchNotification } from "@/lib/notification-service";
import { sentryLogger } from "@/lib/telemetry/sentry";

export async function POST(req: Request) {
  return handleTasksReminders(req);
}

export async function GET(req: Request) {
  return handleTasksReminders(req);
}

async function handleTasksReminders(req: Request) {
  try {
    const receiver = getQStashReceiver();

    if (receiver) {
      const signature = req.headers.get("upstash-signature");
      if (signature) {
        const rawBody = await req.text();
        const isValid = await receiver.verify({
          signature,
          body: rawBody,
          url: req.url,
        });

        if (!isValid) {
          return NextResponse.json(
            { error: "Assinatura QStash inválida" },
            { status: 401 },
          );
        }
      }
    }

    sentryLogger.setScopeContext({
      job: "tasks-reminders",
    });

    const now = new Date();
    const currentDayOfWeek = now.getDay().toString(); // 0-6
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Buscar todas as tarefas ativas com data ou recorrência
    const candidateTasks = await db.query.task.findMany({
      where: and(
        eq(schema.task.status, "todo"),
        or(
          eq(schema.task.isRecurring, true),
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
        // Ex: FREQ=WEEKLY;BYDAY=3;BYTIME=09:00
        const rule = task.recurrenceRule ?? "";
        if (rule.includes(`BYDAY=${currentDayOfWeek}`) || !rule.includes("BYDAY")) {
          shouldRemind = true;
          reminderReason = "Lembrete recorrente";
        }
      } else if (task.date && task.date >= todayStart && task.date <= todayEnd) {
        shouldRemind = true;
        reminderReason = "Planejado para hoje";
      } else if (task.deadline && task.deadline >= todayStart && task.deadline <= todayEnd) {
        shouldRemind = true;
        reminderReason = "Prazo limite é hoje";
      }

      if (shouldRemind) {
        await dispatchNotification({
          organizationId: task.organizationId,
          type: "assignment",
          title: `${reminderReason}: ${task.title}`,
          body: task.description || "Você tem uma tarefa agendada no OpenMinistry.",
          href: "/dashboard/tasks",
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

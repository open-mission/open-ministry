import "server-only";

import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { computePlanItemTimes } from "@/lib/plan-utils";
import { formatEventFullDate, formatEventTimeRange } from "@/lib/events";
import { eventKindLabels, type EventKind } from "@/lib/event-options";
import { generateEventPlanPdfBuffer } from "@/lib/pdf/generator";
import { saveJobFile } from "./storage";

export async function runBackgroundJob(jobId: string): Promise<void> {
  const job = await db.query.backgroundJob.findFirst({
    where: eq(schema.backgroundJob.id, jobId),
  });

  if (!job || job.status === "completed") {
    return;
  }

  // Marcar como processando
  await db
    .update(schema.backgroundJob)
    .set({
      status: "processing",
      startedAt: new Date(),
      progress: 25,
    })
    .where(eq(schema.backgroundJob.id, jobId));

  try {
    if (job.type === "export_cronograma_pdf") {
      const eventId = String(job.payload?.eventId || "");
      if (!eventId) {
        throw new Error("ID do evento ausente no payload da tarefa.");
      }

      const eventRow = await db.query.event.findFirst({
        where: eq(schema.event.id, eventId),
        with: {
          organization: true,
          planItems: {
            with: {
              person: true,
              song: true,
            },
            orderBy: (items, { asc }) => [
              asc(items.order),
              asc(items.createdAt),
            ],
          },
        },
      });

      if (!eventRow) {
        throw new Error("Evento não encontrado.");
      }

      // Progresso 50%
      await db
        .update(schema.backgroundJob)
        .set({ progress: 50 })
        .where(eq(schema.backgroundJob.id, jobId));

      const { computedItems, totalPlanSeconds } = computePlanItemTimes(
        eventRow.startsAt,
        eventRow.planItems,
      );

      const kindLabel =
        eventKindLabels[eventRow.kind as EventKind] || "Culto ou Evento";

      // Progresso 75%
      await db
        .update(schema.backgroundJob)
        .set({ progress: 75 })
        .where(eq(schema.backgroundJob.id, jobId));

      const pdfBuffer = await generateEventPlanPdfBuffer({
        organizationName: eventRow.organization.name,
        organizationLogo: eventRow.organization.logo,
        eventTitle: eventRow.title,
        kindLabel,
        dateLabel: formatEventFullDate(eventRow.startsAt),
        timeLabel: formatEventTimeRange(eventRow.startsAt, eventRow.endsAt),
        location: eventRow.location,
        items: computedItems,
        totalPlannedSeconds: totalPlanSeconds,
      });

      // Salvar arquivo
      await saveJobFile(job.id, pdfBuffer, "pdf");

      const safeFilename = `cronograma-${eventRow.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")}.pdf`;

      // Atualizar job como concluído
      await db
        .update(schema.backgroundJob)
        .set({
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          result: {
            downloadUrl: `/api/jobs/${job.id}/download`,
            fileName: safeFilename,
            fileSize: pdfBuffer.length,
          },
        })
        .where(eq(schema.backgroundJob.id, jobId));

      // Disparar notificação in-app se houver solicitante
      if (job.createdById) {
        try {
          await db.insert(schema.notification).values({
            id: randomUUID(),
            organizationId: job.organizationId,
            userId: job.createdById,
            type: "job_completed",
            title: "Cronograma em PDF pronto!",
            body: `O PDF de "${eventRow.title}" foi gerado em segundo plano e está pronto para download.`,
            href: "/dashboard/jobs",
          });
        } catch {
          // Ignora se notificação falhar
        }
      }

      return;
    }

    throw new Error(`Tipo de tarefa desconhecido: ${job.type}`);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro desconhecido durante o processamento.";
    console.error(`Falha na tarefa de background ${jobId}:`, err);

    await db
      .update(schema.backgroundJob)
      .set({
        status: "failed",
        progress: 100,
        completedAt: new Date(),
        error: errorMsg,
      })
      .where(eq(schema.backgroundJob.id, jobId));
  }
}

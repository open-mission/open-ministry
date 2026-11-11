"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrganizationContext } from "@/lib/organizations";
import {
  createBackgroundJob,
  deleteBackgroundJob,
  listBackgroundJobs,
  retryBackgroundJob,
} from "@/lib/jobs/service";

export async function enqueueEventPlanPdfJobAction(eventId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, eventId),
      eq(schema.event.organizationId, context.organization.id),
    ),
    columns: { title: true },
  });

  if (!event) {
    return { error: "Evento não encontrado." };
  }

  const job = await createBackgroundJob({
    organizationId: context.organization.id,
    type: "export_cronograma_pdf",
    title: `Exportação PDF: ${event.title}`,
    payload: { eventId },
    userId: context.session.user.id,
  });

  revalidatePath("/dashboard/jobs");

  return { ok: true, jobId: job.id };
}

export async function getBackgroundJobsAction() {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada.", jobs: [] };
  }

  const jobs = await listBackgroundJobs(context.organization.id);
  return { ok: true, jobs };
}

export async function retryBackgroundJobAction(jobId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const success = await retryBackgroundJob(jobId, context.organization.id);
  if (!success) {
    return { error: "Não foi possível reiniciar a tarefa." };
  }

  revalidatePath("/dashboard/jobs");
  return { ok: true };
}

export async function deleteBackgroundJobAction(jobId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  await deleteBackgroundJob(jobId, context.organization.id);

  revalidatePath("/dashboard/jobs");
  return { ok: true };
}

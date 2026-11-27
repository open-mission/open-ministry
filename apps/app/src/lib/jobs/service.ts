import "server-only";

import { after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/db";
import * as schema from "@/db/schema";
import type { BackgroundJobRecord, JobType } from "./types";
import { runBackgroundJob } from "./runner";
import { deleteJobFile } from "./storage";
import {
  isWorkflowEnabled,
  triggerJobsWorkflow,
} from "@/lib/workflows/client";

export async function createBackgroundJob(params: {
  organizationId: string;
  type: JobType;
  title: string;
  payload?: Record<string, unknown>;
  userId?: string | null;
  /** Avisos em background disparam o workflow de anúncios separadamente. */
  autoStart?: boolean;
}): Promise<BackgroundJobRecord> {
  const jobId = `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const [record] = await db
    .insert(schema.backgroundJob)
    .values({
      id: jobId,
      organizationId: params.organizationId,
      type: params.type,
      title: params.title,
      status: "pending",
      progress: 0,
      payload: params.payload ?? null,
      createdById: params.userId ?? null,
    })
    .returning();

  if (params.autoStart !== false) {
    const queued = isWorkflowEnabled()
      ? await triggerJobsWorkflow({
          jobId,
          organizationId: params.organizationId,
        })
      : null;

    // Sem workflow (ou se o disparo falhou), mantém o fallback durável da
    // plataforma: executa após a resposta HTTP.
    if (!queued) {
      after(async () => {
        try {
          await runBackgroundJob(jobId);
        } catch (error) {
          console.error(`Erro ao rodar tarefa ${jobId} via after():`, error);
        }
      });
    }
  }

  return record as unknown as BackgroundJobRecord;
}

export async function listBackgroundJobs(
  organizationId: string,
  limit = 50,
): Promise<BackgroundJobRecord[]> {
  const rows = await db.query.backgroundJob.findMany({
    where: eq(schema.backgroundJob.organizationId, organizationId),
    orderBy: [desc(schema.backgroundJob.createdAt)],
    limit,
  });

  return rows as unknown as BackgroundJobRecord[];
}

export async function countActiveJobs(
  organizationId: string,
): Promise<number> {
  const rows = await db.query.backgroundJob.findMany({
    where: and(
      eq(schema.backgroundJob.organizationId, organizationId),
    ),
    columns: { status: true },
  });

  return rows.filter((r) => r.status === "pending" || r.status === "processing")
    .length;
}

export async function deleteBackgroundJob(
  jobId: string,
  organizationId: string,
): Promise<boolean> {
  const existing = await db.query.backgroundJob.findFirst({
    where: and(
      eq(schema.backgroundJob.id, jobId),
      eq(schema.backgroundJob.organizationId, organizationId),
    ),
    columns: { result: true },
  });
  await deleteJobFile(
    jobId,
    "pdf",
    (existing?.result as { fileKey?: string } | null)?.fileKey,
  );

  const res = await db
    .delete(schema.backgroundJob)
    .where(
      and(
        eq(schema.backgroundJob.id, jobId),
        eq(schema.backgroundJob.organizationId, organizationId),
      ),
    );

  return Boolean(res);
}

export async function retryBackgroundJob(
  jobId: string,
  organizationId: string,
): Promise<boolean> {
  const job = await db.query.backgroundJob.findFirst({
    where: and(
      eq(schema.backgroundJob.id, jobId),
      eq(schema.backgroundJob.organizationId, organizationId),
    ),
  });

  if (!job) return false;

  await db
    .update(schema.backgroundJob)
    .set({
      status: "pending",
      progress: 0,
      error: null,
      startedAt: null,
      completedAt: null,
    })
    .where(eq(schema.backgroundJob.id, jobId));

  const queued = isWorkflowEnabled()
    ? await triggerJobsWorkflow({ jobId, organizationId })
    : null;

  if (!queued) {
    after(async () => {
      await runBackgroundJob(jobId);
    });
  }

  return true;
}

import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { runBackgroundJob } from "@/lib/jobs/runner";
import type { JobsWorkflowPayload } from "@/lib/workflows/client";
import { authorizeWorkflowRequest } from "@/lib/workflows/client";

const workflow = serve<JobsWorkflowPayload>(
  async (context) => {
    const payload = context.requestPayload;

    const jobId = await context.run("mark-processing", async () => {
      if (!payload?.jobId) throw new Error("jobId ausente no payload");

      const job = await db.query.backgroundJob.findFirst({
        where: and(
          eq(schema.backgroundJob.id, payload.jobId),
          ...(payload.organizationId
            ? [
                eq(
                  schema.backgroundJob.organizationId,
                  payload.organizationId,
                ),
              ]
            : []),
        ),
      });
      if (!job) throw new Error("Tarefa não encontrada");

      await db
        .update(schema.backgroundJob)
        .set({ status: "processing", startedAt: new Date(), error: null })
        .where(eq(schema.backgroundJob.id, job.id));

      return job.id;
    });

    // O PDF é gerado e enviado ao storage dentro do mesmo step: serializar um
    // Buffer grande entre steps do QStash seria caro e frágil.
    await context.run("generate-and-store-pdf", async () => {
      await runBackgroundJob(jobId);
    });

    await context.run("complete-job-and-notify", async () => {
      const job = await db.query.backgroundJob.findFirst({
        where: eq(schema.backgroundJob.id, jobId),
        columns: { id: true, status: true },
      });
      if (!job || job.status !== "completed") {
        throw new Error("Tarefa não foi concluída pelo gerador de PDF");
      }
      return { jobId: job.id, status: job.status };
    });
  },
  {
    failureFunction: async ({ context, failStatus, failResponse }) => {
      const jobId = context.requestPayload?.jobId;
      if (!jobId) return;

      await db
        .update(schema.backgroundJob)
        .set({
          status: "failed",
          error: `${failStatus}: ${failResponse}`.slice(0, 500),
          completedAt: new Date(),
        })
        .where(eq(schema.backgroundJob.id, jobId));
    },
  },
);

export async function POST(request: Request) {
  if (!(await authorizeWorkflowRequest(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  return workflow.POST(request);
}

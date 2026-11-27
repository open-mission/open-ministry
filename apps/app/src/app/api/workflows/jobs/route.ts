import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { runBackgroundJob } from "@/lib/jobs/runner";
import type { JobsWorkflowPayload } from "@/lib/workflows/client";
import { authorizeWorkflowRequest } from "@/lib/workflows/client";
import { jobInOrganizationWhere } from "@/lib/workflows/tenant";

const workflow = serve<JobsWorkflowPayload>(
  async (context) => {
    const payload = context.requestPayload;

    const { jobId, organizationId } = await context.run(
      "mark-processing",
      async () => {
        if (!payload?.jobId || !payload?.organizationId) {
          throw new Error("jobId e organizationId são obrigatórios");
        }

        const job = await db.query.backgroundJob.findFirst({
          where: jobInOrganizationWhere(
            payload.jobId,
            payload.organizationId,
          ),
        });
        if (!job) throw new Error("Tarefa não encontrada");

        await db
          .update(schema.backgroundJob)
          .set({ status: "processing", startedAt: new Date(), error: null })
          .where(
            and(
              eq(schema.backgroundJob.id, job.id),
              eq(schema.backgroundJob.organizationId, payload.organizationId),
            ),
          );

        return { jobId: job.id, organizationId: payload.organizationId };
      },
    );

    // O PDF é gerado e enviado ao storage dentro do mesmo step: serializar um
    // Buffer grande entre steps do QStash seria caro e frágil.
    await context.run("generate-and-store-pdf", async () => {
      await runBackgroundJob(jobId);
    });

    await context.run("complete-job-and-notify", async () => {
      const job = await db.query.backgroundJob.findFirst({
        where: jobInOrganizationWhere(jobId, organizationId),
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
      const { jobId, organizationId } = context.requestPayload ?? {};
      if (!jobId || !organizationId) return;

      await db
        .update(schema.backgroundJob)
        .set({
          status: "failed",
          error: `${failStatus}: ${failResponse}`.slice(0, 500),
          completedAt: new Date(),
        })
        .where(jobInOrganizationWhere(jobId, organizationId));
    },
  },
);

export async function POST(request: Request) {
  if (!(await authorizeWorkflowRequest(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  return workflow.POST(request);
}

import "server-only";

import { Client } from "@upstash/workflow";

import { getAppBaseUrl } from "@/lib/app-url";
import { isQStashConfigured, verifyQueueEndpointAuth } from "@/lib/queue";

export type JobsWorkflowPayload = {
  jobId: string;
  organizationId: string;
};

export type AnnouncementWorkflowPayload = {
  jobId: string;
  organizationId: string;
  actorId: string;
  announcementBatchId: string;
  title: string;
  body: string;
  sendWhatsApp: boolean;
  sendEmail: boolean;
  sendPush: boolean;
  targetType: "all" | "department" | "person";
  departmentId?: string;
  personId?: string;
};

/**
 * Workflow depende do QStash e de uma URL pública para o callback. Em dev local
 * é possível usar `QSTASH_DEV=true` com o servidor de desenvolvimento.
 */
/**
 * Fail-closed em produção: exige assinatura QStash (ou CRON_SECRET) antes de
 * repassar o request ao `serve`, que também valida a assinatura quando há
 * chaves configuradas.
 */
export async function authorizeWorkflowRequest(request: Request): Promise<boolean> {
  const rawBody = await request.clone().text();
  const auth = await verifyQueueEndpointAuth(request, rawBody);
  return auth.ok;
}

export function isWorkflowEnabled(): boolean {
  if (process.env.QSTASH_DEV === "true" || process.env.QSTASH_DEV === "1") {
    return true;
  }
  return isQStashConfigured() && Boolean(getAppBaseUrl());
}

type TriggerInput<T> = {
  path: "/api/workflows/jobs" | "/api/workflows/announcements";
  body: T;
  workflowRunId?: string;
};

async function triggerWorkflow<T>(
  input: TriggerInput<T>,
): Promise<string | null> {
  if (!isWorkflowEnabled()) return null;

  try {
    const client = new Client({
      token: process.env.QSTASH_TOKEN!,
      ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}),
    });

    const result = await client.trigger({
      url: `${getAppBaseUrl()!.replace(/\/+$/, "")}${input.path}`,
      body: input.body,
      ...(input.workflowRunId
        ? { workflowRunId: input.workflowRunId }
        : {}),
    });

    return result.workflowRunId ?? null;
  } catch (error) {
    // Falha de enfileiramento nunca deve impedir a action de responder.
    console.warn("[workflows] Falha ao disparar workflow:", error);
    return null;
  }
}

export function triggerJobsWorkflow(
  payload: JobsWorkflowPayload,
): Promise<string | null> {
  return triggerWorkflow({
    path: "/api/workflows/jobs",
    body: payload,
    workflowRunId: payload.jobId,
  });
}

export function triggerAnnouncementWorkflow(
  payload: AnnouncementWorkflowPayload,
): Promise<string | null> {
  return triggerWorkflow({
    path: "/api/workflows/announcements",
    body: payload,
    workflowRunId: payload.jobId,
  });
}

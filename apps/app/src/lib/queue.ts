import { Redis } from "@upstash/redis";
import { Client as QStashClient, Receiver } from "@upstash/qstash";

let redisInstance: Redis | null = null;
let qstashInstance: QStashClient | null = null;
let receiverInstance: Receiver | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function isQStashConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN);
}

export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

export function getQStashClient(): QStashClient | null {
  if (!isQStashConfigured()) {
    return null;
  }
  if (!qstashInstance) {
    qstashInstance = new QStashClient({
      token: process.env.QSTASH_TOKEN!,
      baseUrl: process.env.QSTASH_URL,
    });
  }
  return qstashInstance;
}

export function getQStashReceiver(): Receiver | null {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    return null;
  }

  if (!receiverInstance) {
    receiverInstance = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });
  }
  return receiverInstance;
}

export type QueueAuthResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_signature" | "invalid_signature" | "unconfigured";
    };

type QueueSignatureReceiver = {
  verify(args: { signature: string; body: string; url: string }): Promise<boolean>;
};

/**
 * Autenticação fail-closed para endpoints disparados por fila (QStash) ou cron.
 *
 * Regras: bearer `CRON_SECRET` autoriza operação manual; com receiver
 * configurado, a assinatura é sempre obrigatória; sem receiver, apenas
 * ambientes fora de produção aceitam requests sem assinatura.
 */
export async function verifyQueueEndpointAuth(
  req: Request,
  rawBody: string,
  environment: string = process.env.NODE_ENV ?? "development",
  receiver: QueueSignatureReceiver | null = getQStashReceiver(),
): Promise<QueueAuthResult> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true };
  }

  const signature = req.headers.get("upstash-signature");

  if (receiver && signature) {
    const isValid = await receiver.verify({
      signature,
      body: rawBody,
      url: req.url,
    });

    return isValid ? { ok: true } : { ok: false, reason: "invalid_signature" };
  }

  if (receiver && !signature) {
    return { ok: false, reason: "missing_signature" };
  }

  if (environment !== "production") {
    return { ok: true };
  }

  return { ok: false, reason: "unconfigured" };
}

export type NotificationJob = {
  whatsappLogId?: string;
  batchId?: string;
  organizationId: string;
  type: "welcome" | "assignment" | "announcement" | "monthly_availability";
  recipientPhone?: string | null;
  recipientName?: string;
  userId?: string | null;
  personId?: string | null;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Enqueues a notification job via QStash when available.
 * If QStash is not configured or in local dev without CLI, executes the fallback handler.
 */
export async function enqueueNotificationJob(
  job: NotificationJob,
  fallbackExecutor: (job: NotificationJob) => Promise<void>,
): Promise<{ enqueued: boolean }> {
  const qstash = getQStashClient();
  const appBaseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (qstash && appBaseUrl) {
    try {
      const destination = `${appBaseUrl.replace(/\/+$/, "")}/api/webhooks/qstash/notification`;
      await qstash.publishJSON({
        url: destination,
        body: job,
        retries: 3,
      });
      return { enqueued: true };
    } catch (error) {
      console.warn("QStash publish failed, falling back to inline dispatch:", error);
    }
  }

  // Fallback: execute inline
  try {
    await fallbackExecutor(job);
  } catch (error) {
    console.error("Inline notification dispatch failed:", error);
  }

  return { enqueued: false };
}

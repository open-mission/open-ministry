import { createHash, timingSafeEqual } from "node:crypto";

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

  if (cronSecret && authHeader) {
    // Comparação em tempo constante sobre digests de tamanho fixo.
    const expected = createHash("sha256").update(`Bearer ${cronSecret}`).digest();
    const received = createHash("sha256").update(authHeader).digest();
    if (timingSafeEqual(received, expected)) {
      return { ok: true };
    }
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
  type:
    | "welcome"
    | "assignment"
    | "announcement"
    | "monthly_availability"
    | "rehearsal_reminder";
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

/**
 * Limite conservador para agendamentos no QStash. Lembretes mais distantes
 * ficam pendentes no banco e são processados pelo job de varredura.
 */
const MAX_QSTASH_SCHEDULE_MS = 7 * 24 * 60 * 60 * 1000;

function resolveAppBaseUrl(): string | null {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  );
}

/**
 * Converte a chave de deduplicação interna em um id aceito pelo QStash.
 *
 * O header `Upstash-Deduplication-Id` não aceita caracteres como `:`, `-` ou
 * `.` — e a chave de dedupe usa o formato
 * `rehearsal:eventId:ruleId:isoTimestamp`. Por isso enviamos o SHA-256 em hex
 * (64 caracteres [a-f0-9]), que é determinístico e não perde unicidade: a
 * mesma chave sempre gera o mesmo id e chaves diferentes geram ids diferentes.
 */
export function toQStashDeduplicationId(dedupeKey: string): string {
  return createHash("sha256").update(dedupeKey).digest("hex");
}

type ScheduleRehearsalReminderDeps = {
  qstash?: Pick<QStashClient, "publishJSON"> | null;
  appBaseUrl?: string | null;
};

/**
 * Agenda um lembrete de ensaio no QStash. Retorna o messageId quando o
 * agendamento foi aceito; `null` quando o QStash não está configurado, o
 * lembrete está distante demais ou houve falha (o job de varredura cobre).
 *
 * `deps` é opcional e existe para testes: quando omitido, o cliente e a URL
 * são resolvidos do ambiente, exatamente como antes.
 */
export async function scheduleRehearsalReminderJob(
  input: {
    reminderId: string;
    organizationId: string;
    deliverAt: Date;
    dedupeKey: string;
  },
  deps?: ScheduleRehearsalReminderDeps,
): Promise<string | null> {
  const qstash =
    deps?.qstash !== undefined ? deps.qstash : getQStashClient();
  const appBaseUrl =
    deps?.appBaseUrl !== undefined ? deps.appBaseUrl : resolveAppBaseUrl();

  if (!qstash || !appBaseUrl) {
    return null;
  }

  const delayMs = input.deliverAt.getTime() - Date.now();
  if (delayMs > MAX_QSTASH_SCHEDULE_MS) {
    return null;
  }

  try {
    const result = await qstash.publishJSON({
      url: `${appBaseUrl.replace(/\/+$/, "")}/api/jobs/rehearsal-reminders`,
      body: {
        reminderId: input.reminderId,
        organizationId: input.organizationId,
      },
      notBefore: Math.floor(input.deliverAt.getTime() / 1000),
      // Hash obrigatório: a chave contém ":" e o QStash rejeita o header.
      deduplicationId: toQStashDeduplicationId(input.dedupeKey),
      retries: 3,
    });

    return result.messageId ?? null;
  } catch (error) {
    console.warn("Falha ao agendar lembrete de ensaio no QStash:", error);
    return null;
  }
}

/**
 * Cancela uma mensagem agendada no QStash de forma best-effort.
 */
export async function cancelScheduledQStashMessage(
  messageId: string,
): Promise<boolean> {
  const qstash = getQStashClient();
  if (!qstash || !messageId) {
    return false;
  }

  try {
    await qstash.messages.cancel(messageId);
    return true;
  } catch (error) {
    console.warn("Falha ao cancelar mensagem agendada no QStash:", error);
    return false;
  }
}

import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { sendNotification, setVapidDetails } from "web-push";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sentryLogger } from "@/lib/telemetry/sentry";
import { getPlatformWebPushConfig } from "@/lib/platform/integrations-config";

export function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:suporte@openministry.app";

  return { publicKey, privateKey, subject };
}

export function isVapidConfigured(
  config: {
    publicKey: string;
    privateKey: string;
    subject?: string;
  } = getVapidConfig(),
): boolean {
  return Boolean(config.publicKey && config.privateKey);
}

function initWebPush(config = getVapidConfig()) {
  const { publicKey, privateKey, subject } = config;
  setVapidDetails(subject, publicKey, privateKey);
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function savePushSubscription(
  userId: string,
  sub: PushSubscriptionInput,
  userAgent?: string,
) {
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error("Dados de subscrição inválidos");
  }

  const existing = await db.query.pushSubscription.findFirst({
    where: eq(schema.pushSubscription.endpoint, sub.endpoint),
  });

  if (existing) {
    await db
      .update(schema.pushSubscription)
      .set({
        userId,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent ?? null,
      })
      .where(eq(schema.pushSubscription.id, existing.id));
    return existing.id;
  }

  const id = randomUUID();
  await db.insert(schema.pushSubscription).values({
    id,
    userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: userAgent ?? null,
  });

  return id;
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string,
) {
  await db
    .delete(schema.pushSubscription)
    .where(
      and(
        eq(schema.pushSubscription.userId, userId),
        eq(schema.pushSubscription.endpoint, endpoint),
      ),
    );
}

export async function countUserPushSubscriptions(userId: string) {
  const subs = await db.query.pushSubscription.findMany({
    where: eq(schema.pushSubscription.userId, userId),
    columns: { id: true },
  });
  return subs.length;
}

export type SendPushOptions = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export type EffectivePushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
  oneSignalAppId: string;
  oneSignalRestApiKey: string;
  isEnabled: boolean;
};

/** Configuração efetiva: .env + banco, resolvida fora de qualquer cache. */
export async function getEffectivePushConfig(): Promise<EffectivePushConfig> {
  const platform = await getPlatformWebPushConfig();
  const env = getVapidConfig();
  return {
    publicKey: platform.vapidPublicKey || env.publicKey,
    privateKey: platform.vapidPrivateKey || env.privateKey,
    subject: platform.vapidSubject || env.subject,
    oneSignalAppId:
      platform.oneSignalAppId ||
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim() ||
      "",
    oneSignalRestApiKey: platform.oneSignalRestApiKey || "",
    isEnabled: platform.isEnabled,
  };
}

export async function sendWebPushToUser(
  userId: string,
  options: SendPushOptions,
): Promise<{ sentCount: number; errors: number }> {
  const resolved = await getEffectivePushConfig();
  const config = {
    publicKey: resolved.publicKey,
    privateKey: resolved.privateKey,
    subject: resolved.subject,
  };

  if (!resolved.isEnabled) {
    console.warn("[push-notifications] Web Push desativado pela plataforma.", {
      userId,
    });
    return { sentCount: 0, errors: 0 };
  }

  if (!isVapidConfigured(config)) {
    sentryLogger.error(
      "Web push não enviado: chaves VAPID não configuradas no servidor",
      { userId },
    );
    console.error(
      "[push-notifications] Chaves VAPID não configuradas; tentando OneSignal.",
      { userId },
    );
    await maybeSendOneSignal(userId, options, resolved);
    return { sentCount: 0, errors: 1 };
  }

  initWebPush(config);

  const subscriptions = await db.query.pushSubscription.findMany({
    where: eq(schema.pushSubscription.userId, userId),
  });

  if (subscriptions.length === 0) {
    // Optionally check if OneSignal is configured
    await maybeSendOneSignal(userId, options, resolved);
    return { sentCount: 0, errors: 0 };
  }

  const payload = JSON.stringify({
    title: options.title,
    body: options.body,
    url: options.url || "/notifications",
    icon: options.icon || "/icons/icon-192.png",
  });

  let sentCount = 0;
  let errors = 0;

  for (const sub of subscriptions) {
    try {
      await sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      );
      sentCount++;
    } catch (err: unknown) {
      errors++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 404 or 410 Gone means the subscription is no longer valid
      if (statusCode === 404 || statusCode === 410) {
        await db
          .delete(schema.pushSubscription)
          .where(eq(schema.pushSubscription.id, sub.id))
          .catch(() => {});
        continue;
      }

      // Nunca logar endpoint, p256dh, auth ou chaves privadas: apenas
      // identificadores internos e o status HTTP da falha.
      const safeDetails = {
        userId,
        subscriptionId: sub.id,
        statusCode,
      };
      console.error(
        "[push-notifications] Falha ao enviar web push:",
        safeDetails,
      );
      sentryLogger.warn("Falha ao enviar web push", safeDetails);
    }
  }

  return { sentCount, errors };
}

async function maybeSendOneSignal(
  userId: string,
  options: SendPushOptions,
  resolved?: EffectivePushConfig,
) {
  const config = resolved ?? (await getEffectivePushConfig());
  if (!config.isEnabled) return;

  const appId =
    config.oneSignalAppId || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const apiKey =
    config.oneSignalRestApiKey || process.env.ONESIGNAL_REST_API_KEY?.trim();

  if (!appId || !apiKey) {
    return;
  }

  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: {
          external_id: [userId],
        },
        target_channel: "push",
        headings: { en: options.title, pt: options.title },
        contents: { en: options.body, pt: options.body },
        url: options.url || "/notifications",
      }),
    });
  } catch (e) {
    console.warn("Falha no disparo OneSignal:", e);
  }
}

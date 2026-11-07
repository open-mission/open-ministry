"use server";

import { headers } from "next/headers";
import { getOrganizationContext } from "@/lib/organizations";
import {
  countUserPushSubscriptions,
  deletePushSubscription,
  getVapidConfig,
  savePushSubscription,
  sendWebPushToUser,
  type PushSubscriptionInput,
} from "@/lib/push-notifications";

export async function getPushSubscriptionStatusAction() {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Não autenticado", isSubscribed: false, publicKey: "" };
  }

  const { publicKey } = getVapidConfig();
  const count = await countUserPushSubscriptions(context.session.user.id);

  return {
    ok: true,
    isSubscribed: count > 0,
    publicKey,
  };
}

export async function savePushSubscriptionAction(sub: PushSubscriptionInput) {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  try {
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;

    await savePushSubscription(context.session.user.id, sub, userAgent);
    return { ok: true };
  } catch (error) {
    console.error("Erro ao salvar inscrição push:", error);
    return { ok: false, error: "Falha ao registrar notificação no servidor." };
  }
}

export async function removePushSubscriptionAction(endpoint: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  try {
    await deletePushSubscription(context.session.user.id, endpoint);
    return { ok: true };
  } catch (error) {
    console.error("Erro ao remover inscrição push:", error);
    return { ok: false, error: "Falha ao cancelar inscrição." };
  }
}

export async function sendTestPushNotificationAction() {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  try {
    const res = await sendWebPushToUser(context.session.user.id, {
      title: "🔔 Teste de Notificação Push",
      body: `Olá, ${context.session.user.name}! Seu dispositivo está pronto para receber escalas e avisos.`,
      url: "/dashboard/notifications",
    });

    if (res.sentCount === 0) {
      return {
        ok: false,
        error: "Nenhum dispositivo registrado para receber notificações push.",
      };
    }

    return { ok: true, sentCount: res.sentCount };
  } catch (error) {
    console.error("Erro ao enviar notificação de teste:", error);
    return { ok: false, error: "Não foi possível enviar a notificação de teste." };
  }
}

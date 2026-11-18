import {
  getPushSubscriptionStatusAction,
  savePushSubscriptionAction,
} from "@/app/actions/push-notifications";

export function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function isPushActiveOnDevice(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

const PUSH_VAPID_KEY_CACHE = "openministry_push_vapid_key";

export function getCachedVapidKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PUSH_VAPID_KEY_CACHE);
  } catch {
    return null;
  }
}

export function setCachedVapidKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUSH_VAPID_KEY_CACHE, key);
  } catch {
    // Ignore localStorage errors
  }
}

export function clearCachedVapidKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PUSH_VAPID_KEY_CACHE);
  } catch {
    // Ignore localStorage errors
  }
}

export async function subscribeDeviceToPush(vapidPublicKey?: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isPushSupported()) {
    return {
      ok: false,
      error: "Notificações push não são suportadas neste dispositivo.",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        error:
          permission === "denied"
            ? "Permissão bloqueada no navegador. Habilite nas configurações do dispositivo."
            : "Permissão de notificações não concedida.",
      };
    }

    const status = await getPushSubscriptionStatusAction();
    const key = vapidPublicKey || (status.ok ? status.publicKey : "");

    if (!key) {
      return {
        ok: false,
        error: "Chave pública de notificações não configurada.",
      };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    const cachedKey = getCachedVapidKey();
    if (subscription && cachedKey && cachedKey !== key) {
      // A chave pública do servidor mudou: a inscrição antiga não é mais
      // aceita, então é preciso cancelá-la e criar uma nova.
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key),
      });
    }

    if (!subscription) {
      return {
        ok: false,
        error: "Falha ao registrar subscrição push no dispositivo.",
      };
    }

    const json = subscription.toJSON();
    const res = await savePushSubscriptionAction({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        error: res.error || "Erro ao salvar subscrição push no servidor.",
      };
    }

    setCachedVapidKey(key);

    return { ok: true };
  } catch (err) {
    console.error("Falha ao ativar notificações push:", err);
    return {
      ok: false,
      error: "Não foi possível ativar as notificações push.",
    };
  }
}

export async function getPushStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  deviceActive: boolean;
  serverSubscribed: boolean;
  vapidPublicKey: string;
  keyMismatch: boolean;
}> {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      deviceActive: false,
      serverSubscribed: false,
      vapidPublicKey: "",
      keyMismatch: false,
    };
  }

  const permission = Notification.permission;

  let subscription: PushSubscription | null = null;
  try {
    const registration = await navigator.serviceWorker.ready;
    subscription = await registration.pushManager.getSubscription();
  } catch {
    subscription = null;
  }
  const deviceActive = Boolean(subscription);

  const status = await getPushSubscriptionStatusAction();
  let serverSubscribed = Boolean(status.ok && status.isSubscribed);
  const vapidPublicKey = status.ok ? status.publicKey : "";

  const cachedKey = getCachedVapidKey();
  const keyMismatch = Boolean(
    deviceActive && cachedKey && cachedKey !== vapidPublicKey,
  );

  // Repara automaticamente o caso em que o dispositivo tem inscrição mas o
  // servidor perdeu o registro (por exemplo, banco recriado ou sessão nova).
  if (deviceActive && subscription && !serverSubscribed) {
    const json = subscription.toJSON();
    const res = await savePushSubscriptionAction({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
      },
    });
    if (res.ok) {
      serverSubscribed = true;
    }
  }

  return {
    supported: true,
    permission,
    deviceActive,
    serverSubscribed,
    vapidPublicKey,
    keyMismatch,
  };
}

export async function isPushFullyActive(): Promise<boolean> {
  const status = await getPushStatus();
  return (
    status.supported &&
    status.permission === "granted" &&
    status.deviceActive &&
    status.serverSubscribed &&
    !status.keyMismatch
  );
}

const PWA_NOTIFICATION_PROMPT_DISMISS_KEY =
  "openministry_pwa_push_prompt_dismissed_until";

export function isPwaNotificationPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const item = window.localStorage.getItem(
      PWA_NOTIFICATION_PROMPT_DISMISS_KEY,
    );
    if (!item) return false;
    const expiresAt = Number.parseInt(item, 10);
    if (Number.isNaN(expiresAt)) return false;
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export function dismissPwaNotificationPrompt(days = 7): void {
  if (typeof window === "undefined") return;
  try {
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(
      PWA_NOTIFICATION_PROMPT_DISMISS_KEY,
      expiresAt.toString(),
    );
  } catch {
    // Ignore localStorage errors
  }
}

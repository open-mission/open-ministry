import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const VAPID_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

type StatusResult = {
  ok: boolean;
  isSubscribed: boolean;
  publicKey: string;
  error?: string;
};

const statusAction = mock(
  async (): Promise<StatusResult> => ({
    ok: true,
    isSubscribed: false,
    publicKey: VAPID_KEY,
  }),
);

const saveAction = mock(
  async (_sub: unknown): Promise<{ ok: boolean; error?: string }> => ({
    ok: true,
  }),
);

mock.module("@/app/actions/push-notifications", () => ({
  getPushSubscriptionStatusAction: statusAction,
  savePushSubscriptionAction: saveAction,
}));

const {
  clearCachedVapidKey,
  getCachedVapidKey,
  getPushStatus,
  isPushFullyActive,
  setCachedVapidKey,
  urlB64ToUint8Array,
} = await import("@/lib/push-client");

type FakeSubscription = {
  endpoint: string;
  toJSON: () => {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  unsubscribe: () => Promise<boolean>;
};

function createSubscription(): FakeSubscription {
  return {
    endpoint: "https://push.example.test/sub-1",
    toJSON: () => ({
      endpoint: "https://push.example.test/sub-1",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    }),
    unsubscribe: async () => true,
  };
}

type FakeBrowserOptions = {
  permission?: NotificationPermission;
  subscription?: FakeSubscription | null;
};

function installFakeBrowser(options: FakeBrowserOptions = {}) {
  const storage = new Map<string, string>();
  const pushManager = {
    getSubscription: async () => options.subscription ?? null,
    subscribe: async () => options.subscription ?? createSubscription(),
  };
  const notification = {
    permission: options.permission ?? "granted",
    requestPermission: async () => options.permission ?? "granted",
  };
  const windowStub = {
    Notification: notification,
    PushManager: function PushManager() {},
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    atob: (value: string) => atob(value),
  };

  Object.defineProperty(globalThis, "window", {
    value: windowStub,
    configurable: true,
  });
  Object.defineProperty(globalThis, "Notification", {
    value: notification,
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: { serviceWorker: { ready: Promise.resolve({ pushManager }) } },
    configurable: true,
  });

  return { storage, pushManager };
}

const GLOBAL_KEYS = ["window", "Notification", "navigator"] as const;
const originalDescriptors = new Map(
  GLOBAL_KEYS.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);

function restoreGlobals() {
  for (const key of GLOBAL_KEYS) {
    const descriptor = originalDescriptors.get(key);
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  }
}

afterEach(() => {
  restoreGlobals();
});

describe("urlB64ToUint8Array", () => {
  it("converte base64url em bytes com padding e alfabeto URL-safe", () => {
    installFakeBrowser();

    expect(Array.from(urlB64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
    expect(Array.from(urlB64ToUint8Array("AQI"))).toEqual([1, 2]);
    expect(Array.from(urlB64ToUint8Array("_-8"))).toEqual([0xff, 0xef]);
  });
});

describe("cache da chave VAPID", () => {
  it("grava, lê e limpa a chave usada no cadastro", () => {
    installFakeBrowser();

    expect(getCachedVapidKey()).toBeNull();

    setCachedVapidKey(VAPID_KEY);
    expect(getCachedVapidKey()).toBe(VAPID_KEY);

    clearCachedVapidKey();
    expect(getCachedVapidKey()).toBeNull();
  });

  it("não quebra quando o localStorage não está disponível", () => {
    Reflect.deleteProperty(globalThis, "window");

    expect(getCachedVapidKey()).toBeNull();
    expect(() => setCachedVapidKey(VAPID_KEY)).not.toThrow();
    expect(() => clearCachedVapidKey()).not.toThrow();
  });
});

describe("getPushStatus", () => {
  beforeEach(() => {
    statusAction.mockClear();
    saveAction.mockClear();
    statusAction.mockImplementation(async () => ({
      ok: true,
      isSubscribed: false,
      publicKey: VAPID_KEY,
    }));
    saveAction.mockImplementation(async () => ({ ok: true }));
  });

  it("retorna estado 'unsupported' quando o navegador não suporta push", async () => {
    Reflect.deleteProperty(globalThis, "window");

    const status = await getPushStatus();

    expect(status).toEqual({
      supported: false,
      permission: "unsupported",
      deviceActive: false,
      serverSubscribed: false,
      vapidPublicKey: "",
      keyMismatch: false,
    });
    expect(statusAction).not.toHaveBeenCalled();
  });

  it("reflete a permissão negada sem tocar no servidor de subscriptions", async () => {
    installFakeBrowser({ permission: "denied", subscription: null });

    const status = await getPushStatus();

    expect(status.supported).toBe(true);
    expect(status.permission).toBe("denied");
    expect(status.deviceActive).toBe(false);
    expect(status.serverSubscribed).toBe(false);
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("re-salva no servidor quando o dispositivo tem subscription mas o banco não", async () => {
    installFakeBrowser({ subscription: createSubscription() });

    const status = await getPushStatus();

    expect(status.deviceActive).toBe(true);
    expect(status.serverSubscribed).toBe(true);
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(saveAction).toHaveBeenCalledWith({
      endpoint: "https://push.example.test/sub-1",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    });
  });

  it("sinaliza troca de chave VAPID quando a chave em cache difere da atual", async () => {
    installFakeBrowser({ subscription: createSubscription() });
    statusAction.mockImplementation(async () => ({
      ok: true,
      isSubscribed: true,
      publicKey: VAPID_KEY,
    }));
    setCachedVapidKey("chave-antiga");

    const status = await getPushStatus();

    expect(status.keyMismatch).toBe(true);
    expect(await isPushFullyActive()).toBe(false);
  });

  it("isPushFullyActive só é verdadeiro com dispositivo e servidor sincronizados", async () => {
    installFakeBrowser({ subscription: createSubscription() });
    statusAction.mockImplementation(async () => ({
      ok: true,
      isSubscribed: true,
      publicKey: VAPID_KEY,
    }));

    expect(await isPushFullyActive()).toBe(true);
  });
});

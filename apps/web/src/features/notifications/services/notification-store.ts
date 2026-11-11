"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  getRecentNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationStoreState = {
  count: number;
  items: NotificationItem[];
  dismissedBarIds: Set<string>;
  lastFetchedAt: number;
  isLoading: boolean;
  allReadAt: number | null;
};

let state: NotificationStoreState = {
  count: 0,
  items: [],
  dismissedBarIds: new Set<string>(),
  lastFetchedAt: 0,
  isLoading: false,
  allReadAt: null,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const notificationStore = {
  getSnapshot(): NotificationStoreState {
    return state;
  },

  getServerSnapshot(): NotificationStoreState {
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  init({ count, items }: { count: number; items?: NotificationItem[] }) {
    let changed = false;

    if (state.lastFetchedAt === 0 && items && items.length > 0) {
      state = {
        ...state,
        count,
        items,
        lastFetchedAt: Date.now(),
      };
      changed = true;
    } else if (state.count !== count && state.lastFetchedAt === 0) {
      state = {
        ...state,
        count,
      };
      changed = true;
    }

    if (changed) {
      emitChange();
    }
  },

  setCount(newCount: number) {
    if (state.count !== newCount) {
      state = {
        ...state,
        count: newCount,
      };
      emitChange();
    }
  },

  resetForTesting() {
    state = {
      count: 0,
      items: [],
      dismissedBarIds: new Set<string>(),
      lastFetchedAt: 0,
      isLoading: false,
      allReadAt: null,
    };
    emitChange();
  },

  async revalidate(force = false) {
    const now = Date.now();
    // Cache TTL: 30 segundos
    if (!force && state.items.length > 0 && now - state.lastFetchedAt < 30_000) {
      return;
    }

    // Se já temos itens em cache, NÃO definimos isLoading = true para evitar flash de skeleton
    if (state.items.length === 0) {
      state = { ...state, isLoading: true };
      emitChange();
    }

    try {
      const data = await getRecentNotificationsAction(5);
      state = {
        ...state,
        items: data,
        lastFetchedAt: Date.now(),
        isLoading: false,
      };
      emitChange();
    } catch {
      state = { ...state, isLoading: false };
      emitChange();
    }
  },

  dismissBar(notificationId: string) {
    const previousState = {
      count: state.count,
      items: state.items,
      dismissedBarIds: new Set(state.dismissedBarIds),
    };

    const nextDismissed = new Set(state.dismissedBarIds);
    nextDismissed.add(notificationId);

    // Otimista imediato: oculta barra, decrementa badge e marca item como lido
    state = {
      ...state,
      count: Math.max(0, state.count - 1),
      dismissedBarIds: nextDismissed,
      items: state.items.map((i) =>
        i.id === notificationId ? { ...i, read: true } : i,
      ),
    };
    emitChange();

    // Mutação assíncrona em background
    markNotificationReadAction(notificationId)
      .then((res) => {
        if (!res.ok) {
          // Rollback se falhar
          state = {
            ...state,
            count: previousState.count,
            items: previousState.items,
            dismissedBarIds: previousState.dismissedBarIds,
          };
          emitChange();
          toast.error(res.error ?? "Não foi possível marcar como lida.");
        }
      })
      .catch(() => {
        // Rollback em caso de erro de rede
        state = {
          ...state,
          count: previousState.count,
          items: previousState.items,
          dismissedBarIds: previousState.dismissedBarIds,
        };
        emitChange();
        toast.error("Erro ao conectar com o servidor.");
      });
  },

  markAsRead(notificationId: string) {
    const item = state.items.find((i) => i.id === notificationId);
    if (item && item.read) return;

    const previousState = {
      count: state.count,
      items: state.items,
      dismissedBarIds: new Set(state.dismissedBarIds),
    };

    const nextDismissed = new Set(state.dismissedBarIds);
    nextDismissed.add(notificationId);

    state = {
      ...state,
      count: Math.max(0, state.count - 1),
      dismissedBarIds: nextDismissed,
      items: state.items.map((i) =>
        i.id === notificationId ? { ...i, read: true } : i,
      ),
    };
    emitChange();

    markNotificationReadAction(notificationId)
      .then((res) => {
        if (!res.ok) {
          state = {
            ...state,
            count: previousState.count,
            items: previousState.items,
            dismissedBarIds: previousState.dismissedBarIds,
          };
          emitChange();
          toast.error(res.error ?? "Não foi possível marcar como lida.");
        }
      })
      .catch(() => {
        state = {
          ...state,
          count: previousState.count,
          items: previousState.items,
          dismissedBarIds: previousState.dismissedBarIds,
        };
        emitChange();
        toast.error("Erro de conexão.");
      });
  },

  markAllAsRead() {
    if (state.count === 0 && state.items.every((i) => i.read)) {
      return;
    }

    const previousState = {
      count: state.count,
      items: state.items,
      dismissedBarIds: new Set(state.dismissedBarIds),
      allReadAt: state.allReadAt,
    };

    const allIds = new Set(state.dismissedBarIds);
    state.items.forEach((i) => allIds.add(i.id));

    // Otimista imediato: zera tudo
    state = {
      ...state,
      count: 0,
      dismissedBarIds: allIds,
      items: state.items.map((i) => ({ ...i, read: true })),
      allReadAt: Date.now(),
    };
    emitChange();
    toast.success("Todas as notificações foram marcadas como lidas.");

    markAllNotificationsReadAction()
      .then((res) => {
        if (!res.ok) {
          state = {
            ...state,
            count: previousState.count,
            items: previousState.items,
            dismissedBarIds: previousState.dismissedBarIds,
            allReadAt: previousState.allReadAt,
          };
          emitChange();
          toast.error(res.error ?? "Não foi possível marcar todas como lidas.");
        }
      })
      .catch(() => {
        state = {
          ...state,
          count: previousState.count,
          items: previousState.items,
          dismissedBarIds: previousState.dismissedBarIds,
          allReadAt: previousState.allReadAt,
        };
        emitChange();
        toast.error("Erro de conexão.");
      });
  },
};

export function useNotificationStore() {
  const store = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getServerSnapshot,
  );

  return {
    count: store.count,
    items: store.items,
    isLoading: store.isLoading,
    dismissedBarIds: store.dismissedBarIds,
    allReadAt: store.allReadAt,
    isDismissed: (id: string) => store.dismissedBarIds.has(id),
    isNotificationRead: (id: string, initialRead: boolean) => {
      if (store.allReadAt !== null) return true;
      if (initialRead) return true;
      if (store.dismissedBarIds.has(id)) return true;
      const found = store.items.find((item) => item.id === id);
      return found ? found.read : false;
    },
    init: notificationStore.init,
    revalidate: notificationStore.revalidate,
    dismissBar: notificationStore.dismissBar,
    markAsRead: notificationStore.markAsRead,
    markAllAsRead: notificationStore.markAllAsRead,
    setCount: notificationStore.setCount,
  };
}

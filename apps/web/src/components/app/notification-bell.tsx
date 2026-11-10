"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  BellIcon,
  CheckCheckIcon,
  ClipboardListIcon,
  MegaphoneIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type NotificationItem,
  notificationStore,
  useNotificationStore,
} from "@/lib/notification-store";
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from "@/components/notifications/notification-detail-dialog";
import { useIsRealtimeActive } from "@/lib/realtime/client";
import {
  getLiveUnreadNotificationsQuery,
  type LiveNotificationRow,
} from "@/app/actions/realtime-notifications";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { useLiveQuery } from "@neon/realtime-react";
import { cn } from "@/lib/utils";

function LiveNotificationsSubscriber({
  query,
}: {
  query: SealedLiveQuery<LiveNotificationRow>;
}) {
  const refreshQuery = useCallback(async () => {
    const refreshed = await getLiveUnreadNotificationsQuery();
    if (!refreshed) {
      throw new Error("Não foi possível renovar a consulta em tempo real");
    }
    return refreshed;
  }, []);

  const { data: liveRows } = useLiveQuery(query, {
    refreshQuery,
  });

  const { init } = useNotificationStore();
  const previousIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (liveRows) {
      const items: NotificationItem[] = liveRows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read: Boolean(n.readAt),
        createdAt:
          n.createdAt instanceof Date
            ? n.createdAt.toISOString()
            : String(n.createdAt),
      }));

      // Dispara toast para notificações novas em tempo real
      if (previousIdsRef.current !== null) {
        for (const item of items) {
          if (!item.read && !previousIdsRef.current.has(item.id)) {
            toast(item.title, {
              description: item.body ?? undefined,
              action: item.href
                ? {
                    label: "Ver",
                    onClick: () => {
                      window.location.href = item.href!;
                    },
                  }
                : undefined,
            });
          }
        }
      }

      previousIdsRef.current = new Set(items.map((i) => i.id));

      init({
        count: items.filter((i) => !i.read).length,
        items,
      });
    }
  }, [liveRows, init]);

  return null;
}


function TypeIcon({ type }: { type: string }) {
  if (type === "schedule_assigned" || type === "schedule_removed") {
    return <ClipboardListIcon className="size-4 shrink-0 text-primary" />;
  }
  if (type === "announcement") {
    return <MegaphoneIcon className="size-4 shrink-0 text-amber-500" />;
  }
  return <BellIcon className="size-4 shrink-0 text-muted-foreground" />;
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Agora mesmo";
  if (diffMinutes < 60) return `Há ${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `Há ${diffDays}d`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dateStr));
}

type NotificationPanelProps = {
  count: number;
  items: NotificationItem[];
  loading: boolean;
  variant: "drawer" | "popover";
  onMarkAllRead: () => void;
  onItemClick: (item: NotificationItem) => void;
  onClose: () => void;
};

function NotificationPanel({
  count,
  items,
  loading,
  variant,
  onMarkAllRead,
  onItemClick,
  onClose,
}: NotificationPanelProps) {
  const isDrawer = variant === "drawer";

  return (
    <div className={cn("flex flex-1 flex-col min-h-0", isDrawer && "h-full")}>
      <div
        className={cn(
          "flex items-center justify-between gap-3 shrink-0",
          isDrawer ? "bg-background px-5 py-4" : "bg-muted/30 px-4 py-3",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-semibold">
            Notificações
          </span>
          {count > 0 ? (
            <Badge
              variant="secondary"
              className="h-4.5 px-1.5 text-[10px] font-normal"
            >
              {count} {count === 1 ? "nova" : "novas"}
            </Badge>
          ) : null}
        </div>

        {count > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
              isDrawer && "-mr-2 min-h-9 rounded-lg px-2",
            )}
            title="Marcar todas como lidas"
          >
            <CheckCheckIcon className="size-3.5" />
            <span>Marcar lidas</span>
          </button>
        ) : null}
      </div>

      <Separator className="shrink-0" />

      <div
        className={cn(
          "divide-y divide-border/40 overflow-y-auto",
          isDrawer ? "flex-1 min-h-0" : "max-h-[340px]",
        )}
      >
        {loading && items.length === 0 ? (
          <div className={cn("space-y-3", isDrawer ? "p-4" : "p-3")}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-0.5 size-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 px-4 text-center",
              isDrawer ? "py-10" : "py-8",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <BellIcon className="size-5" />
            </span>
            <p className="text-xs font-medium text-foreground">
              Tudo em dia por aqui!
            </p>
            <p className="max-w-[200px] text-xs text-muted-foreground">
              Nenhuma notificação nova no momento.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item)}
              className={cn(
                "group flex w-full items-start gap-3 text-left transition-colors hover:bg-muted/50",
                isDrawer ? "min-h-16 p-4" : "p-3",
                !item.read && "bg-primary/[0.03]",
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                  !item.read
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border/40 bg-muted/40 text-muted-foreground",
                )}
              >
                <TypeIcon type={item.type} />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className={cn(
                      "truncate text-xs font-medium",
                      !item.read
                        ? "font-semibold text-foreground"
                        : "text-foreground/80",
                    )}
                  >
                    {item.title}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                {item.body ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                ) : null}
              </div>

              {!item.read ? (
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  title="Não lida"
                />
              ) : null}
            </button>
          ))
        )}
      </div>

      <Separator className="shrink-0" />

      <div
        className={cn(
          "shrink-0",
          isDrawer
            ? "bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : "bg-muted/20 p-2",
        )}
      >
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-between text-xs text-muted-foreground hover:text-foreground",
            isDrawer ? "h-11 text-sm" : "h-8",
          )}
        >
          <Link href="/dashboard/notifications" prefetch={true} onClick={onClose}>
            <span>Ver todas as notificações</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell({
  initialCount,
  initialItems,
  sealedQuery,
}: {
  initialCount: number;
  initialItems?: NotificationItem[];
  sealedQuery?: SealedLiveQuery<LiveNotificationRow> | null;
}) {
  const isMobile = useIsMobile();
  const isRealtimeActive = useIsRealtimeActive();
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    count,
    items,
    isLoading,
    init,
    revalidate,
    markAsRead,
    markAllAsRead,
    setCount,
  } = useNotificationStore();

  useEffect(() => {
    init({ count: initialCount, items: initialItems });
  }, [init, initialCount, initialItems]);

  // Periodicamente atualiza a contagem de não lidas (5 minutos + detecção de visibilidade da aba)
  // Ignorado quando o WebSocket do Neon Realtime estiver ativo.
  useEffect(() => {
    if (isRealtimeActive && sealedQuery) {
      return;
    }

    let active = true;

    async function loadCount() {
      // Evita requisições se a aba estiver em segundo plano ou minimizada
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      try {
        const response = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as { count?: number };
        if (active && typeof data.count === "number") {
          if (data.count > count && count >= 0) {
            void revalidate(true).then(() => {
              const latest = notificationStore.getSnapshot().items[0];
              if (latest && !latest.read) {
                toast(latest.title, {
                  description: latest.body ?? undefined,
                  action: latest.href
                    ? {
                        label: "Ver",
                        onClick: () => {
                          window.location.href = latest.href!;
                        },
                      }
                    : undefined,
                });
              }
            });
          }
          setCount(data.count);
        }
      } catch {
        // Tenta no próximo ciclo
      }
    }

    // Intervalo de 5 minutos (300.000 ms) para evitar spam de requisições nos logs
    const interval = window.setInterval(loadCount, 5 * 60 * 1000);

    // Revalida automaticamente quando o usuário voltar para a aba
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void loadCount();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [count, revalidate, setCount, isRealtimeActive, sealedQuery]);

  // Escuta notificações disparadas diretamente no app
  useEffect(() => {
    const handleInAppNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{
        title: string;
        body?: string | null;
        href?: string | null;
      }>;
      const detail = customEvent.detail;
      if (detail) {
        toast(detail.title, {
          description: detail.body ?? undefined,
          action: detail.href
            ? {
                label: "Ver",
                onClick: () => {
                  window.location.href = detail.href!;
                },
              }
            : undefined,
        });
        void revalidate(true);
      }
    };

    window.addEventListener(
      "openministry:notification",
      handleInAppNotification,
    );
    return () => {
      window.removeEventListener(
        "openministry:notification",
        handleInAppNotification,
      );
    };
  }, [revalidate]);

  // Fetch recent notifications when the panel opens (stale-while-revalidate cached)
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void revalidate();
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    toast.success("Notificações marcadas como lidas.");
  };

  const handleItemClick = (item: NotificationItem) => {
    setSelectedNotification(item);
    setDetailOpen(true);
    setOpen(false);
  };

  const trigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative"
      aria-label={
        count > 0 ? `${count} notificações não lidas` : "Notificações"
      }
      title="Notificações"
    >
      <BellIcon className="size-4" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] leading-none font-medium text-primary-foreground shadow-xs animate-in zoom-in-75">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  );

  return (
    <>
      {isRealtimeActive && sealedQuery ? (
        <LiveNotificationsSubscriber query={sealedQuery} />
      ) : null}

      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="h-[90dvh] max-h-[90dvh] data-[vaul-drawer-direction=bottom]:max-h-[90dvh] flex flex-col gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Notificações</DrawerTitle>
              <DrawerDescription>
                Suas notificações recentes e avisos da igreja.
              </DrawerDescription>
            </DrawerHeader>
            <NotificationPanel
              count={count}
              items={items}
              loading={isLoading}
              variant="drawer"
              onMarkAllRead={handleMarkAllRead}
              onItemClick={handleItemClick}
              onClose={() => setOpen(false)}
            />
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 overflow-hidden rounded-xl border border-border/70 p-0 shadow-lg sm:w-96"
          >
            <NotificationPanel
              count={count}
              items={items}
              loading={isLoading}
              variant="popover"
              onMarkAllRead={handleMarkAllRead}
              onItemClick={handleItemClick}
              onClose={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}

      <NotificationDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        notification={selectedNotification}
        onMarkAsRead={(id) => {
          markAsRead(id);
          if (selectedNotification && selectedNotification.id === id) {
            setSelectedNotification({ ...selectedNotification, read: true });
          }
        }}
      />
    </>
  );
}

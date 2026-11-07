"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BellIcon,
  CheckCheckIcon,
  ClipboardListIcon,
  MegaphoneIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  getRecentNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationPreviewItem,
} from "@/app/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export function NotificationBell({
  initialCount,
}: {
  initialCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<NotificationPreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Periodically refresh unread count
  useEffect(() => {
    let active = true;

    async function loadCount() {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as { count?: number };
        if (active && typeof data.count === "number") {
          setCount(data.count);
        }
      } catch {
        // Retry next cycle
      }
    }

    const interval = window.setInterval(loadCount, 45_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Fetch recent notifications when popover opens
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      getRecentNotificationsAction(5)
        .then((data) => {
          setItems(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.ok) {
        setCount(0);
        setItems((prev) => prev.map((item) => ({ ...item, read: true })));
        toast.success("Todas as notificações foram marcadas como lidas.");
      } else {
        toast.error("Não foi possível marcar como lidas.");
      }
    });
  };

  const handleItemClick = (item: NotificationPreviewItem) => {
    setOpen(false);
    startTransition(async () => {
      if (!item.read) {
        setCount((prev) => Math.max(0, prev - 1));
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)),
        );
        await markNotificationReadAction(item.id);
      }

      if (item.href) {
        router.push(item.href);
      } else {
        router.push("/dashboard/notifications");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
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
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-medium leading-none text-primary-foreground shadow-xs animate-in zoom-in-75">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-xl shadow-lg border border-border/70 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-semibold">Notificações</span>
            {count > 0 ? (
              <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-normal">
                {count} {count === 1 ? "nova" : "novas"}
              </Badge>
            ) : null}
          </div>

          {count > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Marcar todas como lidas"
            >
              <CheckCheckIcon className="size-3.5" />
              <span>Marcar lidas</span>
            </button>
          ) : null}
        </div>

        <Separator />

        <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40">
          {loading ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="size-7 rounded-full shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <BellIcon className="size-5" />
              </span>
              <p className="text-xs font-medium text-foreground">
                Tudo em dia por aqui!
              </p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Nenhuma notificação nova no momento.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={cn(
                  "w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/50 cursor-pointer group",
                  !item.read && "bg-primary/[0.03]",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                    !item.read
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted/40 border-border/40 text-muted-foreground",
                  )}
                >
                  <TypeIcon type={item.type} />
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        !item.read ? "text-foreground font-semibold" : "text-foreground/80",
                      )}
                    >
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  {item.body ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  ) : null}
                </div>

                {!item.read ? (
                  <span
                    className="size-2 rounded-full bg-primary shrink-0 mt-1.5"
                    title="Não lida"
                  />
                ) : null}
              </button>
            ))
          )}
        </div>

        <Separator />

        <div className="p-2 bg-muted/20">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <Link href="/dashboard/notifications">
              <span>Ver todas as notificações</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

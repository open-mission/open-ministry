"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BellIcon,
  ClipboardListIcon,
  MegaphoneIcon,
} from "lucide-react";
import { toast } from "sonner";

import { markNotificationReadAction } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAtLabel: string;
};

function TypeIcon({ type }: { type: string }) {
  if (type === "schedule_assigned" || type === "schedule_removed") {
    return <ClipboardListIcon className="size-4" />;
  }

  if (type === "announcement") {
    return <MegaphoneIcon className="size-4" />;
  }

  return <BellIcon className="size-4" />;
}

export function NotificationRow({
  notification,
}: {
  notification: NotificationItem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    startTransition(async () => {
      if (!notification.read) {
        const result = await markNotificationReadAction(notification.id);

        if (!result.ok) {
          toast.error(
            result.error ?? "Não foi possível marcar como lida.",
          );
          return;
        }
      }

      if (notification.href) {
        router.push(notification.href);
        return;
      }

      router.refresh();
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleOpen}
        disabled={pending}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-60",
          notification.read ? null : "bg-primary/5",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
            notification.read
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          <TypeIcon type={notification.type} />
        </span>

        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "text-sm font-medium",
                notification.read
                  ? "text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {notification.title}
            </span>
            {!notification.read ? (
              <span
                aria-label="Não lida"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
              />
            ) : null}
          </span>

          {notification.body ? (
            <span className="block text-xs leading-relaxed text-muted-foreground">
              {notification.body}
            </span>
          ) : null}

          <span className="block text-[0.7rem] text-muted-foreground">
            {notification.createdAtLabel}
          </span>
        </span>

        {notification.href ? (
          <ArrowRightIcon className="mt-2 size-4 shrink-0 text-primary" />
        ) : null}
      </button>
    </li>
  );
}

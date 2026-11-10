"use client";

import Link from "next/link";
import { BellIcon } from "lucide-react";

import { DismissNotificationButton } from "@/components/app/dismiss-notification-button";
import type { NotificationRecord } from "@/lib/notifications";
import { useNotificationStore } from "@/lib/notification-store";

export function NotificationBar({
  notification,
  count,
}: {
  notification: NotificationRecord;
  count: number;
}) {
  const { isDismissed, count: storeCount } = useNotificationStore();

  if (isDismissed(notification.id) || storeCount === 0) {
    return null;
  }

  const effectiveCount = Math.max(1, storeCount || count);

  return (
    <div className="border-b bg-accent/50 px-4 py-2.5 transition-all duration-200 animate-in fade-in sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background/70 text-accent-foreground">
          <BellIcon className="size-3.5" />
        </span>

        <Link
          href={notification.href ?? "/dashboard/notifications"}
          className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <p className="truncate text-sm font-medium text-accent-foreground">
            {notification.title}
          </p>
          {notification.body ? (
            <p className="hidden truncate text-xs text-accent-foreground/75 sm:block">
              {notification.body}
            </p>
          ) : null}
        </Link>

        {effectiveCount > 1 ? (
          <Link
            href="/dashboard/notifications"
            className="shrink-0 text-xs font-medium text-accent-foreground hover:underline"
          >
            +{effectiveCount - 1}
          </Link>
        ) : null}

        <DismissNotificationButton notificationId={notification.id} />
      </div>
    </div>
  );
}

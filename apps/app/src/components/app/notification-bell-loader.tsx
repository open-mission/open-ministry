import { connection } from "next/server";
import { BellIcon } from "lucide-react";

import { NotificationBell } from "@/components/app/notification-bell";
import { Button } from "@/components/ui/button";
import { getUnreadNotificationSummary } from "@/lib/notifications";
import { getLiveUnreadNotificationsQuery } from "@/app/actions/realtime-notifications";

export async function NotificationBellLoader() {
  await connection();

  const [{ count, recent }, sealedQuery] = await Promise.all([
    getUnreadNotificationSummary(),
    getLiveUnreadNotificationsQuery(),
  ]);

  return (
    <NotificationBell
      key={count}
      initialCount={count}
      initialItems={recent}
      sealedQuery={sealedQuery}
    />
  );
}

export function NotificationBellFallback() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled
      aria-label="Notificações"
      title="Notificações"
    >
      <BellIcon />
    </Button>
  );
}

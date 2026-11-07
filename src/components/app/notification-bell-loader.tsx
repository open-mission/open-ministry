import { connection } from "next/server";
import { BellIcon } from "lucide-react";

import { NotificationBell } from "@/components/app/notification-bell";
import { Button } from "@/components/ui/button";
import { getUnreadNotificationSummary } from "@/lib/notifications";

export async function NotificationBellLoader() {
  await connection();

  const { count, recent } = await getUnreadNotificationSummary();

  return (
    <NotificationBell
      key={count}
      initialCount={count}
      initialItems={recent}
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

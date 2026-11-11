"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/lib/notification-store";

export function DismissNotificationButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const { dismissBar } = useNotificationStore();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-accent-foreground"
      aria-label="Marcar notificação como lida"
      title="Marcar como lida"
      onClick={() => dismissBar(notificationId)}
    >
      <XIcon />
    </Button>
  );
}

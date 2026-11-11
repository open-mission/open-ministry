"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/lib/notification-store";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { markAllAsRead } = useNotificationStore();

  function handleMarkAll() {
    markAllAsRead();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleMarkAll}
    >
      <CheckCheckIcon data-icon="inline-start" />
      {pending ? "Marcando..." : "Marcar todas como lidas"}
    </Button>
  );
}

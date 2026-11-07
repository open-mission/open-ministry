"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/lib/notification-store";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { markAllAsRead } = useNotificationStore();

  function handleMarkAll() {
    markAllAsRead();
    toast.success("Todas as notificações foram marcadas como lidas.");
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

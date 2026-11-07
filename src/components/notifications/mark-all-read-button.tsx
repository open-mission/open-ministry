"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();

      if (result.ok) {
        toast.success("Notificações marcadas como lidas.");
        router.refresh();
        return;
      }

      toast.error(
        result.error ?? "Não foi possível marcar as notificações.",
      );
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

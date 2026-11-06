"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { markNotificationReadAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

export function DismissNotificationButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);

      if (result.ok) {
        router.refresh();
        return;
      }

      toast.error(result.error ?? "Não foi possível marcar como lida.");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-accent-foreground"
      aria-label="Marcar notificação como lida"
      title="Marcar como lida"
      disabled={pending}
      onClick={handleDismiss}
    >
      <XIcon />
    </Button>
  );
}

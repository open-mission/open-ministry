"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { stopImpersonatingAction } from "@/app/actions/impersonation";
import { Button } from "@/components/ui/button";

export function StopImpersonatingButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleStop() {
    startTransition(async () => {
      const result = await stopImpersonatingAction();

      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível voltar à sua conta.");
        return;
      }

      toast.success("Você voltou para a sua conta.");
      router.push("/dashboard/members");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 shrink-0 border-destructive/30 bg-background/70 text-destructive hover:bg-background"
      onClick={handleStop}
      disabled={pending}
    >
      <LogOutIcon data-icon="inline-start" />
      <span className="hidden sm:inline">Voltar para minha conta</span>
      <span className="sm:hidden">Voltar</span>
    </Button>
  );
}

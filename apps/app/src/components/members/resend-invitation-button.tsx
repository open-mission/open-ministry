"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { resendInvitationAction } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";

export function ResendInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleResend() {
    startTransition(async () => {
      const result = await resendInvitationAction(invitationId);

      if (result.ok) {
        toast.success("Novo convite gerado com sucesso.");
        return;
      }

      toast.error(result.error ?? "Não foi possível renovar o convite.");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={pending}
      className="h-8 gap-1.5 text-xs font-normal"
      title="Renovar este convite e gerar novo link válido por 7 dias"
    >
      <RefreshCwIcon className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
      Renovar convite
    </Button>
  );
}

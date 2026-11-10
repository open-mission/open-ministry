"use client";

import { useTransition } from "react";
import { LoaderCircleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { cancelInvitationAction } from "@/app/actions/invitations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function CancelInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelInvitationAction(invitationId);

      if (result.ok) {
        toast.success("Convite cancelado.");
      } else {
        toast.error(result.error ?? "Não foi possível cancelar o convite.");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Cancelar convite de ${email}`}
          title="Cancelar convite"
          disabled={pending}
        >
          {pending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <XIcon />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <XIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Cancelar este convite?</AlertDialogTitle>
          <AlertDialogDescription>
            O link enviado para {email} deixará de funcionar. Você poderá gerar
            um novo convite depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter convite</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleCancel}
            disabled={pending}
          >
            Cancelar convite
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

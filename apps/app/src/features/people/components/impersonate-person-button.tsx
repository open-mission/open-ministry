"use client";

import { useTransition } from "react";
import { UserRoundCogIcon } from "lucide-react";
import { toast } from "sonner";

import { impersonateMemberAction } from "@/app/actions/impersonation";
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

export function ImpersonatePersonButton({
  userId,
  personName,
}: {
  userId: string;
  personName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleImpersonate() {
    startTransition(async () => {
      const result = await impersonateMemberAction(userId);

      if (!result.ok) {
        toast.error(
          result.error ?? "Não foi possível entrar como essa pessoa.",
        );
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Entrar como ${personName}`}
          title="Ver como essa pessoa"
        >
          <UserRoundCogIcon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <UserRoundCogIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Entrar como {personName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Você verá o painel como essa pessoa. Um aviso no topo permite
            voltar para a sua conta quando quiser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleImpersonate}
            disabled={pending}
          >
            Entrar como {personName}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

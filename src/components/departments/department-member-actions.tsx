"use client";

import { useTransition } from "react";
import { CrownIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  removeDepartmentMemberAction,
  setDepartmentLeaderAction,
} from "@/app/actions/departments";
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

export function DepartmentMemberActions({
  memberId,
  memberName,
  isLeader,
  canManageLeaders,
}: {
  memberId: string;
  memberName: string;
  isLeader: boolean;
  canManageLeaders: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggleLeader() {
    startTransition(async () => {
      const result = await setDepartmentLeaderAction(memberId, !isLeader);

      if (result.ok) {
        toast.success(
          isLeader
            ? `${memberName} não lidera mais este departamento.`
            : `${memberName} agora lidera este departamento.`,
        );
        return;
      }

      toast.error(result.error ?? "Não foi possível atualizar a liderança.");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeDepartmentMemberAction(memberId);

      if (result.ok) {
        toast.success("Pessoa removida do departamento.");
        return;
      }

      toast.error(result.error ?? "Não foi possível remover a pessoa.");
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canManageLeaders ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={isLeader ? "text-accent-foreground" : undefined}
          aria-label={
            isLeader
              ? `Remover liderança de ${memberName}`
              : `Tornar ${memberName} líder`
          }
          title={isLeader ? "Remover liderança" : "Tornar líder"}
          disabled={pending}
          onClick={handleToggleLeader}
        >
          <CrownIcon className={isLeader ? "fill-current" : undefined} />
        </Button>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            aria-label={`Remover ${memberName} do departamento`}
            title="Remover do departamento"
            disabled={pending}
          >
            <Trash2Icon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Remover {memberName} do departamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              As funções e os níveis de experiência desta pessoa neste
              departamento serão removidos. Ela continua fazendo parte da
              igreja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter pessoa</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRemove}
              disabled={pending}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

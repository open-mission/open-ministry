"use client";

import { useState, useTransition } from "react";
import { CrownIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  removeDepartmentMemberAction,
  setDepartmentLeaderAction,
} from "@/app/actions/departments";
import { ResponsiveAlertDialog } from "@/components/app/responsive-alert-dialog";
import { DepartmentWhatsAppInviteDialog } from "@/components/departments/department-whatsapp-invite-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DepartmentMemberActions({
  memberId,
  memberName,
  isLeader,
  canManageLeaders,
  departmentId,
  departmentName,
  personId,
}: {
  memberId: string;
  memberName: string;
  isLeader: boolean;
  canManageLeaders: boolean;
  departmentId?: string;
  departmentName?: string;
  personId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [leaderConfirmOpen, setLeaderConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

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
      {departmentId && personId ? (
        <DepartmentWhatsAppInviteDialog
          departmentId={departmentId}
          departmentName={departmentName || "Departamento"}
          personId={personId}
          personName={memberName}
        />
      ) : null}

      {canManageLeaders ? (
        <ResponsiveAlertDialog
          open={leaderConfirmOpen}
          onOpenChange={setLeaderConfirmOpen}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn("max-sm:size-9", isLeader && "text-accent-foreground")}
              aria-label={
                isLeader
                  ? `Remover liderança de ${memberName}`
                  : `Tornar ${memberName} líder`
              }
              title={isLeader ? "Remover liderança" : "Tornar líder"}
              disabled={pending}
            >
              <CrownIcon className={isLeader ? "fill-current" : undefined} />
            </Button>
          }
          icon={<CrownIcon className={isLeader ? "fill-current" : undefined} />}
          iconClassName="bg-accent/60 text-accent-foreground"
          title={isLeader ? "Remover liderança?" : "Nomear como líder?"}
          description={
            isLeader
              ? `Remover ${memberName} da liderança deste ministério? Ela continuará como voluntária da equipe, mas sem privilégios de gestão.`
              : `Tornar ${memberName} líder deste ministério? Esta pessoa terá acesso à gestão de voluntários e visualização confidencial dos níveis de experiência.`
          }
          cancelLabel={isLeader ? "Manter liderança" : "Agora não"}
          confirmLabel={
            isLeader ? "Remover liderança" : "Confirmar nomeação"
          }
          confirmVariant={isLeader ? "destructive" : "default"}
          pending={pending}
          onConfirm={() => {
            setLeaderConfirmOpen(false);
            handleToggleLeader();
          }}
        />
      ) : null}

      <ResponsiveAlertDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="max-sm:size-9 text-destructive"
            aria-label={`Remover ${memberName} do departamento`}
            title="Remover do departamento"
            disabled={pending}
          >
            <Trash2Icon />
          </Button>
        }
        icon={<Trash2Icon />}
        iconClassName="bg-destructive/10 text-destructive"
        title={`Remover ${memberName} do departamento?`}
        description="As funções e os níveis de experiência desta pessoa neste departamento serão removidos. Ela continua fazendo parte da igreja."
        cancelLabel="Manter pessoa"
        confirmLabel="Remover"
        confirmVariant="destructive"
        pending={pending}
        onConfirm={() => {
          setRemoveConfirmOpen(false);
          handleRemove();
        }}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  KeyRoundIcon,
  PlusIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserCheckIcon,
} from "lucide-react";

import {
  grantDepartmentPermissionAction,
  revokeDepartmentPermissionAction,
  type DepartmentGrantViewItem,
} from "@/app/actions/department-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODULE_KEYS,
  PERMISSION_CATALOG,
  type ModuleKey,
} from "@/lib/permissions/catalog";

type DepartmentMemberItem = {
  id: string;
  person: {
    id: string;
    name: string;
    userId: string | null;
  } | null;
  isLeader: boolean;
};

type DepartmentPermissionsSectionProps = {
  departmentId: string;
  departmentName: string;
  members: DepartmentMemberItem[];
  initialGrants: DepartmentGrantViewItem[];
  canManage: boolean;
};

export function DepartmentPermissionsSection({
  departmentId,
  departmentName,
  members,
  initialGrants,
  canManage,
}: DepartmentPermissionsSectionProps) {
  const [grants, setGrants] = useState<DepartmentGrantViewItem[]>(initialGrants);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("agenda");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Membros elegíveis (que possuem conta de login no sistema)
  const eligibleMembers = members
    .filter((m) => m.person?.userId)
    .map((m) => ({
      userId: m.person!.userId!,
      name: m.person!.name,
      isLeader: m.isLeader,
    }));

  // Ações delegáveis para o módulo selecionado
  const delegableActions = Object.values(
    PERMISSION_CATALOG[selectedModule].actions,
  ).filter((a) => a.delegable);

  const handleGrant = () => {
    if (!selectedUserId || !selectedAction) {
      toast.error("Selecione o membro e a ação para conceder.");
      return;
    }

    startTransition(async () => {
      const res = await grantDepartmentPermissionAction({
        departmentId,
        userId: selectedUserId,
        moduleKey: selectedModule,
        action: selectedAction,
      });

      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Permissão concedida com sucesso!");
        const member = eligibleMembers.find((m) => m.userId === selectedUserId);
        const newGrant: DepartmentGrantViewItem = {
          id: res.data.id,
          departmentId,
          granteeUserId: selectedUserId,
          granteeName: member?.name ?? "Membro",
          granteeEmail: "",
          moduleKey: selectedModule,
          action: selectedAction,
          grantedByUserId: "",
          grantedByName: "Você",
          createdAt: new Date(),
        };
        setGrants((curr) => [newGrant, ...curr]);
        setIsDialogOpen(false);
        setSelectedAction("");
      }
    });
  };

  const handleRevoke = (grantId: string) => {
    startTransition(async () => {
      const res = await revokeDepartmentPermissionAction({ grantId });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Concessão revogada com sucesso.");
        setGrants((curr) => curr.filter((g) => g.id !== grantId));
      }
    });
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4" />
            </span>
            <CardTitle className="font-heading text-xl tracking-tight">
              Concessões Individuais de Acesso
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground sm:text-sm">
            Permissões delegadas a membros específicos dentro de{" "}
            <span className="font-medium text-foreground">{departmentName}</span>.
            Concessões são aditivas e não substituem a necessidade do módulo estar ativo.
          </CardDescription>
        </div>

        {canManage && eligibleMembers.length > 0 ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 self-start sm:self-auto">
                <PlusIcon className="size-4" />
                Nova Concessão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Conceder Acesso Departamental</DialogTitle>
                <DialogDescription>
                  Delegue uma ação específica para um voluntário deste departamento.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Seleção do Membro */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Membro do Departamento
                  </label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um membro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleMembers.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.name} {m.isLeader ? "(Líder)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seleção do Módulo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Módulo
                  </label>
                  <Select
                    value={selectedModule}
                    onValueChange={(val) => {
                      setSelectedModule(val as ModuleKey);
                      setSelectedAction("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {PERMISSION_CATALOG[k].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seleção da Ação Delegável */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Ação Delegável
                  </label>
                  {delegableActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Este módulo não possui ações delegáveis individualmente.
                    </p>
                  ) : (
                    <Select
                      value={selectedAction}
                      onValueChange={setSelectedAction}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma ação delegável..." />
                      </SelectTrigger>
                      <SelectContent>
                        {delegableActions.map((a) => (
                          <SelectItem key={a.key} value={a.key}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGrant}
                  disabled={isPending || !selectedUserId || !selectedAction}
                >
                  Confirmar Concessão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardHeader>

      <CardContent>
        {grants.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-muted-foreground">
            <UserCheckIcon className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium">Nenhuma concessão ativa</p>
            <p className="text-xs text-muted-foreground">
              Os voluntários usam as permissões padrão herdadas de seus papéis.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/60">
            {grants.map((grant) => {
              const modDef = PERMISSION_CATALOG[grant.moduleKey];
              const actDef = modDef
                ? (modDef.actions as Record<string, any>)[grant.action]
                : null;

              return (
                <div
                  key={grant.id}
                  className="flex items-center justify-between p-3.5 first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {grant.granteeName}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {modDef?.name ?? grant.moduleKey}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ação:{" "}
                      <span className="font-medium text-foreground">
                        {actDef?.label ?? grant.action}
                      </span>{" "}
                      · Concedido por {grant.grantedByName}
                    </p>
                  </div>

                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => handleRevoke(grant.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Revogar permissão"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

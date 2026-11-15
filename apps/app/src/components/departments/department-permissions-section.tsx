"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  KeyRoundIcon,
  PlusIcon,
  Trash2Icon,
  UserCheckIcon,
} from "lucide-react";

import {
  grantDepartmentPermissionAction,
  revokeDepartmentPermissionAction,
  type DepartmentGrantViewItem,
} from "@/app/actions/department-permissions";
import { ResponsiveDialog } from "@/components/app/responsive-dialog";
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

  // Ações delegáveis para o recurso selecionado
  const delegableActions = Object.values(
    PERMISSION_CATALOG[selectedModule].actions,
  ).filter((a) => a.delegable);

  const handleGrant = () => {
    if (!selectedUserId || !selectedAction) {
      toast.error("Selecione a pessoa e o que ela poderá fazer.");
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
        toast.success("Permissão concedida.");
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
        toast.success("Permissão removida.");
        setGrants((curr) => curr.filter((g) => g.id !== grantId));
      }
    });
  };

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4" />
            </span>
            <CardTitle className="font-heading text-xl tracking-tight">
              Permissões da Equipe
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground sm:text-sm">
            Permissões extras para voluntários de{" "}
            <span className="font-medium text-foreground">
              {departmentName}
            </span>
            . Essas permissões autorizam pessoas específicas a gerenciar
            escalas, músicas ou avisos quando o recurso estiver ativo na igreja.
          </CardDescription>
        </div>

        {canManage && eligibleMembers.length > 0 ? (
          <ResponsiveDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            trigger={
              <Button
                size="sm"
                className="min-h-10 gap-1.5 self-start sm:self-auto"
              >
                <PlusIcon className="size-4" />
                Conceder permissão
              </Button>
            }
            title="Conceder permissão"
            description="Escolha a pessoa e o que ela poderá ajudar a cuidar neste ministério."
            contentClassName="sm:max-w-md"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                  className="max-sm:min-h-11 max-sm:w-full"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGrant}
                  disabled={isPending || !selectedUserId || !selectedAction}
                  className="max-sm:min-h-11 max-sm:w-full"
                >
                  {isPending ? "Concedendo..." : "Conceder permissão"}
                </Button>
              </>
            }
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="department-grant-person"
                  className="text-xs font-medium text-foreground"
                >
                  Pessoa da equipe
                </label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger id="department-grant-person">
                    <SelectValue placeholder="Selecione uma pessoa..." />
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

              <div className="space-y-1.5">
                <label
                  htmlFor="department-grant-module"
                  className="text-xs font-medium text-foreground"
                >
                  Recurso
                </label>
                <Select
                  value={selectedModule}
                  onValueChange={(val) => {
                    setSelectedModule(val as ModuleKey);
                    setSelectedAction("");
                  }}
                >
                  <SelectTrigger id="department-grant-module">
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

              <div className="space-y-1.5">
                <label
                  htmlFor="department-grant-action"
                  className="text-xs font-medium text-foreground"
                >
                  O que poderá fazer
                </label>
                {delegableActions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Este recurso não tem permissões individuais.
                  </p>
                ) : (
                  <Select
                    value={selectedAction}
                    onValueChange={setSelectedAction}
                  >
                    <SelectTrigger id="department-grant-action">
                      <SelectValue placeholder="Escolha uma ação..." />
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
          </ResponsiveDialog>
        ) : null}
      </CardHeader>

      <CardContent>
        {grants.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-muted-foreground">
            <UserCheckIcon className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">
              Nenhuma permissão individual ativa
            </p>
            <p className="text-xs text-muted-foreground">
              A equipe segue as permissões do próprio perfil. Nada extra foi
              liberado aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/60">
            {grants.map((grant) => {
              const modDef = PERMISSION_CATALOG[grant.moduleKey];
              const actDef = modDef
                ? (modDef.actions as Record<string, { label: string }>)[
                    grant.action
                  ]
                : null;

              return (
                <div
                  key={grant.id}
                  className="flex items-center justify-between gap-3 p-3.5 first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {grant.granteeName}
                      </span>
                      <Badge variant="outline" className="text-[11px]">
                        {modDef?.name ?? grant.moduleKey}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Pode{" "}
                      <span className="font-medium text-foreground">
                        {actDef?.label ?? grant.action}
                      </span>{" "}
                      · Liberado por {grant.grantedByName}
                    </p>
                  </div>

                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => handleRevoke(grant.id)}
                      className="max-sm:size-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover permissão de ${grant.granteeName}`}
                      title="Remover permissão"
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

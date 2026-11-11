"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  InfoIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  setOrganizationModuleEnabledAction,
  setOrganizationRolePermissionAction,
  type OrganizationPermissionSettingsData,
} from "@/app/actions/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  MODULE_KEYS,
  PERMISSION_CATALOG,
  type ModuleKey,
  type PermissionRole,
} from "@/lib/permissions/catalog";
import type { FullPermissionPolicy } from "@/lib/permissions/defaults";
import { getPolicyActionEnabled } from "@/lib/permissions/evaluator";

type ModulePermissionsCardProps = {
  initialSettings: OrganizationPermissionSettingsData;
};

export function ModulePermissionsCard({
  initialSettings,
}: ModulePermissionsCardProps) {
  const [modules, setModules] = useState(initialSettings.modules);
  const [policy, setPolicy] = useState<FullPermissionPolicy>(
    initialSettings.policy,
  );
  const [selectedRole, setSelectedRole] = useState<PermissionRole>("member");
  const [isPending, startTransition] = useTransition();

  const handleToggleModule = (moduleKey: ModuleKey, nextEnabled: boolean) => {
    // Atualização otimista
    const prev = [...modules];
    setModules((current) =>
      current.map((m) =>
        m.moduleKey === moduleKey ? { ...m, enabled: nextEnabled } : m,
      ),
    );

    startTransition(async () => {
      const res = await setOrganizationModuleEnabledAction(
        moduleKey,
        nextEnabled,
      );
      if (!res.ok) {
        setModules(prev);
        toast.error(res.error);
      } else {
        toast.success(
          nextEnabled
            ? `Módulo ${PERMISSION_CATALOG[moduleKey].name} habilitado para a igreja.`
            : `Módulo ${PERMISSION_CATALOG[moduleKey].name} desabilitado para a igreja.`,
        );
      }
    });
  };

  const handleTogglePermission = (
    role: PermissionRole,
    moduleKey: ModuleKey,
    action: string,
    nextEnabled: boolean,
  ) => {
    // Atualização otimista
    const prevPolicy = JSON.parse(JSON.stringify(policy));
    setPolicy((current) => {
      const next = JSON.parse(JSON.stringify(current));
      if (next[role]?.[moduleKey]) {
        next[role][moduleKey][action] = nextEnabled;
      }
      return next;
    });

    startTransition(async () => {
      const res = await setOrganizationRolePermissionAction(
        role,
        moduleKey,
        action,
        nextEnabled,
      );
      if (!res.ok) {
        setPolicy(prevPolicy);
        toast.error(res.error);
      } else {
        toast.success("Permissão atualizada com sucesso.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Disponibilidade de Módulos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            <CardTitle>Disponibilidade de Módulos</CardTitle>
          </div>
          <CardDescription>
            Controle quais módulos estão ativos para toda a igreja. Módulos
            desativados aqui não ficam acessíveis em nenhum departamento, mas a
            configuração departamental é preservada para quando forem reativados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {MODULE_KEYS.map((key) => {
              const def = PERMISSION_CATALOG[key];
              const setting = modules.find((m) => m.moduleKey === key);
              const isEnabled = setting ? setting.enabled : true;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-foreground">
                        {def.name}
                      </span>
                      <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className="text-[10px] py-0 px-1.5"
                      >
                        {isEnabled ? "Ativo na igreja" : "Desativado"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {def.description}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    disabled={isPending}
                    onCheckedChange={(val) => handleToggleModule(key, val)}
                    aria-label={`Habilitar módulo ${def.name}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Matriz de Permissões por Papel */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="size-5 text-primary" />
                <CardTitle>Permissões Padrão por Papel</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Configure os privilégios base atribuídos aos membros, líderes e
                administradores na igreja.
              </CardDescription>
            </div>

            {/* Seletor de Papel */}
            <div className="flex rounded-lg bg-muted p-1 text-xs">
              {(["member", "leader", "admin"] as const).map((r) => {
                const label =
                  r === "member"
                    ? "Membro"
                    : r === "leader"
                      ? "Líder"
                      : "Administrador";
                const isSelected = selectedRole === r;

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      isSelected
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {MODULE_KEYS.map((moduleKey) => {
            const def = PERMISSION_CATALOG[moduleKey];
            const actions = Object.values(def.actions);

            return (
              <div key={moduleKey} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-heading text-sm font-semibold">
                    {def.name}
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {actions.length} ações
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {actions.map((act) => {
                    const isOrgOrSelf =
                      act.scope === "organization" || act.scope === "self";
                    const isLeaderScopedNote =
                      selectedRole === "leader" && isOrgOrSelf;

                    const isEnabled = getPolicyActionEnabled(
                      policy,
                      selectedRole,
                      moduleKey,
                      act.key,
                    );

                    return (
                      <div
                        key={act.key}
                        className="flex items-start justify-between gap-4 py-1"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-foreground">
                              {act.label}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/80">
                              ({act.key})
                            </span>
                            {act.delegable ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] py-0 px-1 font-normal"
                              >
                                Delegável
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {act.description}
                          </p>
                          {isLeaderScopedNote ? (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                              <InfoIcon className="size-3 shrink-0" />
                              Ação de igreja/pessoal: a política de Membro é
                              aplicada para não-administradores.
                            </p>
                          ) : null}
                        </div>

                        <Switch
                          checked={isEnabled}
                          disabled={isPending || selectedRole === "admin"}
                          onCheckedChange={(val) =>
                            handleTogglePermission(
                              selectedRole,
                              moduleKey,
                              act.key,
                              val,
                            )
                          }
                          aria-label={`Permissão ${act.label} para ${selectedRole}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

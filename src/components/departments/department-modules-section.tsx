"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { BlocksIcon, CheckCircle2Icon } from "lucide-react";

import { toggleDepartmentModuleAction } from "@/app/actions/modules";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AVAILABLE_MODULES, type ModuleKey } from "@/lib/modules";

type DepartmentModulesSectionProps = {
  departmentId: string;
  activeModuleKeys: string[];
  canManage: boolean;
};

export function DepartmentModulesSection({
  departmentId,
  activeModuleKeys,
  canManage,
}: DepartmentModulesSectionProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticKeys, setOptimisticKeys] = useOptimistic(
    activeModuleKeys,
    (current, update: { key: string; enabled: boolean }) => {
      if (update.enabled) {
        return current.includes(update.key)
          ? current
          : [...current, update.key];
      }
      return current.filter((k) => k !== update.key);
    },
  );

  const handleToggle = (moduleKey: ModuleKey, nextChecked: boolean) => {
    startTransition(async () => {
      setOptimisticKeys({ key: moduleKey, enabled: nextChecked });

      const formData = new FormData();
      formData.append("departmentId", departmentId);
      formData.append("moduleKey", moduleKey);
      formData.append("enabled", String(nextChecked));

      const result = await toggleDepartmentModuleAction(formData);

      if (!result.ok) {
        toast.error(result.error ?? "Erro ao alterar módulo.");
      } else {
        toast.success(
          nextChecked
            ? "Módulo ativado para este departamento!"
            : "Módulo desativado para este departamento.",
        );
      }
    });
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="gap-1.5 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BlocksIcon className="size-4" />
          </span>
          <CardTitle className="font-heading text-xl tracking-tight">
            Módulos do Departamento
          </CardTitle>
        </div>
        <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Ative módulos específicos para conceder aos membros deste
          departamento acesso a ferramentas dedicadas (como repertório de
          músicas, escalas avançadas e itens no menu lateral).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/60">
          {AVAILABLE_MODULES.map((mod) => {
            const isChecked = optimisticKeys.includes(mod.key);
            const Icon = mod.icon;

            return (
              <div
                key={mod.key}
                className="flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/30 text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {mod.name}
                      </span>
                      {mod.badge ? (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] font-normal"
                        >
                          {mod.badge}
                        </Badge>
                      ) : null}
                      {isChecked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2Icon className="size-3" />
                          Ativo no departamento
                        </span>
                      ) : null}
                    </div>
                    <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 sm:shrink-0 sm:pt-0">
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {isChecked ? "Módulo ativo" : "Módulo inativo"}
                  </span>
                  {canManage ? (
                    <Switch
                      checked={isChecked}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        handleToggle(mod.key, checked)
                      }
                      aria-label={`Ativar módulo ${mod.name}`}
                    />
                  ) : (
                    <Badge
                      variant={isChecked ? "default" : "outline"}
                      className="text-xs"
                    >
                      {isChecked ? "Ativado" : "Inativo"}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

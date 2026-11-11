import { ListChecksIcon } from "lucide-react";

import { DeleteFunctionButton } from "@/components/departments/delete-function-button";
import {
  CreateFunctionDialog,
  EditFunctionDialog,
} from "@/components/departments/function-form-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DepartmentRecord } from "@/lib/departments";

export function FunctionsSection({
  department,
  canManage,
}: {
  department: DepartmentRecord;
  canManage: boolean;
}) {
  const assignments = department.members.flatMap(
    (member) => member.assignments,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="font-heading text-xl tracking-tight">
            Funções
          </CardTitle>
          <CardDescription>
            As áreas de atuação deste departamento.
          </CardDescription>
        </div>
        {canManage ? (
          <CreateFunctionDialog departmentId={department.id} />
        ) : null}
      </CardHeader>
      <CardContent>
        {department.functions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListChecksIcon className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhuma função ainda</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                {canManage
                  ? "Cadastre as funções para depois distribuir as pessoas e os níveis de experiência."
                  : "Quando a liderança cadastrar as funções, elas aparecem aqui."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {department.functions.map((departmentFunction) => {
              const assigned = assignments.filter(
                (assignment) =>
                  assignment.functionId === departmentFunction.id,
              ).length;

              return (
                <li
                  key={departmentFunction.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {departmentFunction.name}
                      </p>
                      <span className="text-[0.7rem] text-muted-foreground">
                        {assigned === 0
                          ? "ninguém atribuído"
                          : assigned === 1
                            ? "1 pessoa"
                            : `${assigned} pessoas`}
                      </span>
                    </div>
                    {departmentFunction.description ? (
                      <p className="max-w-[48ch] text-xs leading-relaxed text-muted-foreground">
                        {departmentFunction.description}
                      </p>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <EditFunctionDialog
                        departmentId={department.id}
                        departmentFunction={departmentFunction}
                      />
                      <DeleteFunctionButton
                        functionId={departmentFunction.id}
                        functionName={departmentFunction.name}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

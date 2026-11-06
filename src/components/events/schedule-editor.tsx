import Link from "next/link";
import { CrownIcon } from "lucide-react";

import { AddAssignmentDialog } from "@/components/events/add-assignment-dialog";
import { RemoveAssignmentButton } from "@/components/events/remove-assignment-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DepartmentRecord } from "@/lib/departments";
import { getInitials } from "@/lib/format";

type Assignment = {
  id: string;
  departmentId: string;
  functionId: string;
  userId: string;
  user: { name: string; image: string | null };
  function: { name: string };
};

export function ScheduleEditor({
  eventId,
  departments,
  assignments,
  currentUserId,
  isAdmin,
}: {
  eventId: string;
  departments: DepartmentRecord[];
  assignments: Assignment[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {departments.map((department) => {
        const departmentAssignments = assignments.filter(
          (assignment) => assignment.departmentId === department.id,
        );
        const filledFunctions = new Set(
          departmentAssignments.map((assignment) => assignment.functionId),
        ).size;
        const leaders = department.members.filter((member) => member.isLeader);
        const canManage =
          isAdmin ||
          department.members.some(
            (member) => member.userId === currentUserId && member.isLeader,
          );
        const memberOptions = department.members
          .map((member) => ({
            id: member.userId,
            name: member.user.name,
            email: member.user.email,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

        return (
          <Card key={department.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="font-heading text-lg tracking-tight">
                  <Link
                    href={`/dashboard/departments/${department.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {department.name}
                  </Link>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <CrownIcon className="size-3 text-accent-foreground" />
                    {leaders.length === 0
                      ? "Sem líder definido"
                      : leaders.map((leader) => leader.user.name).join(", ")}
                  </span>
                  {department.functions.length > 0 ? (
                    <>
                      <span aria-hidden className="text-border">
                        ·
                      </span>
                      <span>
                        {filledFunctions} de {department.functions.length}{" "}
                        funções
                      </span>
                    </>
                  ) : null}
                </CardDescription>
              </div>

              {canManage && department.functions.length > 0 ? (
                <AddAssignmentDialog
                  eventId={eventId}
                  departmentId={department.id}
                  departmentName={department.name}
                  functions={department.functions.map(
                    (departmentFunction) => ({
                      id: departmentFunction.id,
                      name: departmentFunction.name,
                    }),
                  )}
                  members={memberOptions}
                  assignments={departmentAssignments.map((assignment) => ({
                    functionId: assignment.functionId,
                    userId: assignment.userId,
                  }))}
                />
              ) : null}
            </CardHeader>

            <CardContent className="space-y-3">
              {department.functions.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground">
                  {canManage ? (
                    <>
                      Nenhuma função cadastrada.{" "}
                      <Link
                        href={`/dashboard/departments/${department.id}`}
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        Configurar funções
                      </Link>
                      .
                    </>
                  ) : (
                    "Nenhuma função cadastrada neste departamento."
                  )}
                </div>
              ) : (
                department.functions.map((departmentFunction) => {
                  const functionAssignments = departmentAssignments.filter(
                    (assignment) =>
                      assignment.functionId === departmentFunction.id,
                  );

                  return (
                    <div key={departmentFunction.id} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">
                          {departmentFunction.name}
                        </p>
                        <span className="text-[0.7rem] whitespace-nowrap text-muted-foreground">
                          {functionAssignments.length === 0
                            ? "vazio"
                            : functionAssignments.length === 1
                              ? "1 pessoa"
                              : `${functionAssignments.length} pessoas`}
                        </span>
                      </div>

                      {functionAssignments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Ninguém escalado ainda.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {functionAssignments.map((assignment) => (
                            <span
                              key={assignment.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-0.5 pr-1.5 pl-0.5 text-xs text-secondary-foreground"
                            >
                              <Avatar className="size-5">
                                <AvatarImage
                                  src={assignment.user.image ?? undefined}
                                  alt={assignment.user.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-[0.55rem] font-medium text-primary">
                                  {getInitials(assignment.user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="max-w-40 truncate">
                                {assignment.user.name}
                              </span>
                              {canManage ? (
                                <RemoveAssignmentButton
                                  assignmentId={assignment.id}
                                  userName={assignment.user.name}
                                  functionName={departmentFunction.name}
                                />
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

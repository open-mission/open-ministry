"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyIcon, CrownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { copyLastScaleAction } from "@/app/actions/events";
import { AddAssignmentDialog } from "@/components/events/add-assignment-dialog";
import { InlineAssignmentPicker } from "@/components/events/inline-assignment-picker";
import { RemoveAssignmentButton } from "@/components/events/remove-assignment-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DepartmentRecord } from "@/lib/departments";
import { getInitials } from "@/lib/format";
import {
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
  type PersonLike,
} from "@/lib/person-format";

export type ScheduleAssignment = {
  id: string;
  departmentId: string;
  functionId: string;
  personId: string;
  person: PersonLike;
  function: { name: string };
};

export function ScheduleEditor({
  eventId,
  departments,
  assignments,
  currentUserId,
  isAdmin,
  unavailablePeopleMap,
  onAddAssignment,
  onRemoveAssignment,
  onRestoreAssignment,
}: {
  eventId: string;
  departments: DepartmentRecord[];
  assignments: ScheduleAssignment[];
  currentUserId: string;
  isAdmin: boolean;
  unavailablePeopleMap?: Record<
    string,
    { isBlocked: boolean; reason?: string | null }
  >;
  onAddAssignment: (assignment: ScheduleAssignment) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onRestoreAssignment: (assignment: ScheduleAssignment) => void;
}) {
  const [copyingDepartmentId, setCopyingDepartmentId] = useState<string | null>(
    null,
  );

  const handleCopyLastScale = async (departmentId: string) => {
    setCopyingDepartmentId(departmentId);

    try {
      const result = await copyLastScaleAction(eventId, departmentId);

      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível copiar a escala.");
        return;
      }

      if (!result.assignments || result.assignments.length === 0) {
        toast.info("Nenhuma pessoa nova para copiar do último encontro.");
        return;
      }

      for (const assignment of result.assignments) {
        onAddAssignment(assignment);
      }

      const copiedCount = result.copiedCount ?? result.assignments.length;
      toast.success(
        copiedCount === 1
          ? "1 pessoa copiada do último encontro."
          : `${copiedCount} pessoas copiadas do último encontro.`,
      );
    } finally {
      setCopyingDepartmentId(null);
    }
  };

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
            (member) =>
              member.person?.userId === currentUserId && member.isLeader,
          );
        const memberOptions = department.members
          .map((member) => ({
            id: member.personId,
            name: personDisplayName(member.person),
            email: personDisplayEmail(member.person),
            image: personDisplayImage(member.person),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        const isCopying = copyingDepartmentId === department.id;

        return (
          <Card key={department.id}>
            <CardHeader className="flex flex-wrap flex-row items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <CardTitle className="font-heading text-lg tracking-tight">
                  <Link
                    href={`/dashboard/departments/${department.id}`}
                    prefetch={true}
                    className="underline-offset-4 hover:underline"
                  >
                    {department.name}
                  </Link>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem]">
                  <span className="inline-flex items-center gap-1">
                    <CrownIcon className="size-3 text-accent-foreground" />
                    {leaders.length === 0
                      ? "Sem líder definido"
                      : leaders
                          .map((leader) => personDisplayName(leader.person))
                          .join(", ")}
                  </span>
                  {department.functions.length > 0 ? (
                    <>
                      <span aria-hidden className="text-border">
                        ·
                      </span>
                      <span>
                        {filledFunctions} de {department.functions.length}{" "}
                        funções cobertas
                      </span>
                    </>
                  ) : null}
                </CardDescription>
              </div>

              {canManage && department.functions.length > 0 ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-[0.8125rem] text-muted-foreground hover:text-foreground"
                    title="Copiar a escala do último encontro em que este departamento atuou"
                    disabled={isCopying}
                    onClick={() => handleCopyLastScale(department.id)}
                  >
                    {isCopying ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                    <span className="hidden sm:inline">Copiar</span>
                    <span className="sr-only sm:hidden">
                      Copiar escala do último encontro
                    </span>
                  </Button>

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
                      personId: assignment.personId,
                    }))}
                    unavailablePeopleMap={unavailablePeopleMap}
                    onAssignmentAdded={onAddAssignment}
                    onAssignmentRollback={onRemoveAssignment}
                  />
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-3">
              {canManage && department.members.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  Nenhuma pessoa neste departamento ainda.{" "}
                  <Link
                    href={`/dashboard/departments/${department.id}`}
                    prefetch={true}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Adicionar pessoas
                  </Link>
                  .
                </div>
              ) : null}

              {department.functions.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {canManage ? (
                    <>
                      Nenhuma função cadastrada.{" "}
                      <Link
                        href={`/dashboard/departments/${department.id}`}
                        prefetch={true}
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium">
                            {departmentFunction.name}
                          </p>
                          <span className="text-[0.8125rem] whitespace-nowrap text-muted-foreground">
                            {functionAssignments.length === 0
                              ? "vazio"
                              : functionAssignments.length === 1
                                ? "1 pessoa"
                                : `${functionAssignments.length} pessoas`}
                          </span>
                        </div>

                        {canManage ? (
                          <InlineAssignmentPicker
                            eventId={eventId}
                            departmentId={department.id}
                            functionId={departmentFunction.id}
                            functionName={departmentFunction.name}
                            members={memberOptions}
                            assignedPersonIds={functionAssignments.map(
                              (assignment) => assignment.personId,
                            )}
                            unavailablePeopleMap={unavailablePeopleMap}
                            label={
                              functionAssignments.length === 0
                                ? "Escalar"
                                : "Adicionar"
                            }
                            onAdded={onAddAssignment}
                          />
                        ) : null}
                      </div>

                      {functionAssignments.length === 0 ? (
                        <p className="text-[0.8125rem] text-muted-foreground">
                          Ninguém escalado ainda.
                        </p>
                      ) : (
                        <ul
                          className="flex flex-wrap gap-1.5"
                          aria-label={`Pessoas escaladas em ${departmentFunction.name}`}
                        >
                          {functionAssignments.map((assignment) => (
                            <li
                              key={assignment.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-0.5 pr-1 pl-0.5 text-[0.8125rem] text-secondary-foreground"
                            >
                              <Avatar className="size-6">
                                <AvatarImage
                                  src={
                                    personDisplayImage(assignment.person) ??
                                    undefined
                                  }
                                  alt={personDisplayName(assignment.person)}
                                />
                                <AvatarFallback className="bg-primary/10 text-[0.55rem] font-medium text-primary">
                                  {getInitials(
                                    personDisplayName(assignment.person),
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <span className="max-w-40 truncate">
                                {personDisplayName(assignment.person)}
                              </span>
                              {canManage ? (
                                <RemoveAssignmentButton
                                  assignmentId={assignment.id}
                                  userName={personDisplayName(
                                    assignment.person,
                                  )}
                                  functionName={departmentFunction.name}
                                  onRemove={() =>
                                    onRemoveAssignment(assignment.id)
                                  }
                                  onRollback={() =>
                                    onRestoreAssignment(assignment)
                                  }
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
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

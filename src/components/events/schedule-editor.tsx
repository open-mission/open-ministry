"use client";

import { useState } from "react";
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
import {
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
  type PersonLike,
} from "@/lib/person-format";

type Assignment = {
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
  assignments: initialAssignments,
  currentUserId,
  isAdmin,
  unavailablePeopleMap,
}: {
  eventId: string;
  departments: DepartmentRecord[];
  assignments: Assignment[];
  currentUserId: string;
  isAdmin: boolean;
  unavailablePeopleMap?: Record<string, { isBlocked: boolean; reason?: string | null }>;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [prevInitialAssignments, setPrevInitialAssignments] = useState(initialAssignments);

  if (initialAssignments !== prevInitialAssignments) {
    setPrevInitialAssignments(initialAssignments);
    setAssignments(initialAssignments);
  }

  const handleAssignmentAdded = (newAssignment: Assignment) => {
    setAssignments((prev) => [
      ...prev.filter(
        (a) =>
          !(
            a.departmentId === newAssignment.departmentId &&
            a.functionId === newAssignment.functionId &&
            a.personId === newAssignment.personId
          ),
      ),
      newAssignment,
    ]);
  };

  const handleAssignmentRollback = (tempId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== tempId));
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
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
                    personId: assignment.personId,
                  }))}
                  unavailablePeopleMap={unavailablePeopleMap}
                  onAssignmentAdded={handleAssignmentAdded}
                  onAssignmentRollback={handleAssignmentRollback}
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
                                  onRemove={() => handleRemoveAssignment(assignment.id)}
                                  onRollback={() => setAssignments(initialAssignments)}
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

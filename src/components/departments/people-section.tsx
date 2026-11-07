import { CrownIcon, UsersIcon } from "lucide-react";

import { AddDepartmentMemberDialog } from "@/components/departments/add-department-member-dialog";
import { DepartmentMemberActions } from "@/components/departments/department-member-actions";
import { MemberFunctionsDialog } from "@/components/departments/member-functions-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DepartmentRecord } from "@/lib/departments";
import {
  experienceLevelLabels,
  type ExperienceLevel,
} from "@/lib/experience";
import { getInitials } from "@/lib/format";
import {
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
} from "@/lib/person-format";

type DepartmentMember = DepartmentRecord["members"][number];

type AvailableMember = {
  id: string;
  name: string;
  email: string | null;
  hasAccount: boolean;
};

function sortMembers(members: DepartmentMember[]) {
  return [...members].sort((a, b) => {
    if (a.isLeader !== b.isLeader) {
      return a.isLeader ? -1 : 1;
    }

    return personDisplayName(a.person).localeCompare(
      personDisplayName(b.person),
      "pt-BR",
    );
  });
}

export function PeopleSection({
  department,
  availableMembers,
  canManage,
  canManageLeaders,
  canViewExperience,
}: {
  department: DepartmentRecord;
  availableMembers: AvailableMember[];
  canManage: boolean;
  canManageLeaders: boolean;
  canViewExperience: boolean;
}) {
  const members = sortMembers(department.members);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="font-heading text-xl tracking-tight">
            Pessoas
          </CardTitle>
          <CardDescription>
            {members.length === 0
              ? "Ninguém faz parte deste departamento ainda."
              : members.length === 1
                ? "1 pessoa serve neste departamento."
                : `${members.length} pessoas servem neste departamento.`}
          </CardDescription>
        </div>
        {canManage ? (
          <AddDepartmentMemberDialog
            departmentId={department.id}
            availableMembers={availableMembers}
            canManageLeaders={canManageLeaders}
          />
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UsersIcon className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhuma pessoa ainda</p>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                {canManage
                  ? "Adicione as pessoas que servem neste ministério e defina as funções de cada uma."
                  : "Quando a liderança adicionar pessoas, elas aparecem aqui."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>
                    {canViewExperience ? "Funções e experiência" : "Funções"}
                  </TableHead>
                  {canManage ? (
                    <TableHead className="text-right">Ações</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex min-w-48 items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarImage
                            src={
                              personDisplayImage(member.person) ?? undefined
                            }
                            alt={personDisplayName(member.person)}
                          />
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(personDisplayName(member.person))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-medium">
                              {personDisplayName(member.person)}
                            </p>
                            {member.isLeader ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 font-normal"
                              >
                                <CrownIcon className="size-3" />
                                Líder
                              </Badge>
                            ) : null}
                            {!member.person.userId ? (
                              <Badge
                                variant="outline"
                                className="font-normal"
                              >
                                Sem conta
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {personDisplayEmail(member.person) ??
                              "Sem email cadastrado"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {member.assignments.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sem função definida
                        </span>
                      ) : (
                        <div className="flex min-w-40 flex-wrap gap-1.5">
                          {member.assignments.map((assignment) => (
                            <span
                              key={assignment.id}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              {assignment.function.name}
                              {canViewExperience ? (
                                <span className="font-normal text-muted-foreground">
                                  {" · "}
                                  {experienceLevelLabels[
                                    assignment.experienceLevel as ExperienceLevel
                                  ] ?? assignment.experienceLevel}
                                </span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    {canManage ? (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <MemberFunctionsDialog
                            member={member}
                            functions={department.functions}
                          />
                          <DepartmentMemberActions
                            memberId={member.id}
                            memberName={personDisplayName(member.person)}
                            isLeader={member.isLeader}
                            canManageLeaders={canManageLeaders}
                            departmentId={department.id}
                            departmentName={department.name}
                            personId={member.personId}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

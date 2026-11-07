import Link from "next/link";
import { CrownIcon } from "lucide-react";

import { RoleBadge } from "@/components/members/role-badge";
import { DeletePersonButton } from "@/components/people/delete-person-button";
import { EditPersonDialog } from "@/components/people/edit-person-dialog";
import { ImpersonatePersonButton } from "@/components/people/impersonate-person-button";
import { InvitePersonDialog } from "@/components/people/invite-person-dialog";
import { LinkPersonDialog } from "@/components/people/link-person-dialog";
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
import { formatOwnBirthday } from "@/lib/birthdays";
import { getInitials } from "@/lib/format";
import {
  personDisplayBirthday,
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
} from "@/lib/person-format";
import type { PersonRecord } from "@/lib/people";

type LinkableMember = {
  id: string;
  name: string;
  email: string;
};

export function PeopleTable({
  people,
  roleByUserId,
  linkableMembers,
  isAdmin,
  currentUserId,
}: {
  people: PersonRecord[];
  roleByUserId: Record<string, string>;
  linkableMembers: LinkableMember[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const withAccount = people.filter((person) => person.userId).length;
  const withoutAccount = people.length - withAccount;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Pessoas da igreja
        </CardTitle>
        <CardDescription>
          {people.length === 1
            ? "1 pessoa faz parte da igreja."
            : `${people.length} pessoas fazem parte da igreja.`}{" "}
          {withoutAccount > 0
            ? `${withAccount} com conta e ${withoutAccount} sem conta.`
            : "Todas já têm uma conta."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {people.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhuma pessoa cadastrada ainda.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Departamentos</TableHead>
                      {isAdmin ? (
                        <TableHead className="text-right">Ações</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.map((person) => {
                      const role = person.userId
                        ? roleByUserId[person.userId]
                        : undefined;
                      const birthdayLabel = formatOwnBirthday(
                        personDisplayBirthday(person),
                        isAdmin,
                      );

                      return (
                        <TableRow key={person.id}>
                          <TableCell>
                            <Link
                              href={`/dashboard/members/${person.id}`}
                              className="group flex min-w-56 items-center gap-3"
                            >
                              <Avatar className="size-9 ring-1 ring-border group-hover:ring-primary transition-all">
                                <AvatarImage
                                  src={
                                    personDisplayImage(person) ?? undefined
                                  }
                                  alt={personDisplayName(person)}
                                />
                                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                  {getInitials(personDisplayName(person))}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 space-y-0.5">
                                <p className="truncate text-sm font-medium group-hover:text-primary group-hover:underline transition-colors">
                                  {personDisplayName(person)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {personDisplayEmail(person) ??
                                    "Sem email cadastrado"}
                                </p>
                                {birthdayLabel ? (
                                  <p className="text-[0.7rem] text-muted-foreground">
                                    Aniversário: {birthdayLabel}
                                  </p>
                                ) : null}
                              </div>
                            </Link>
                          </TableCell>

                          <TableCell>
                            {role ? (
                              <RoleBadge role={role} />
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-normal"
                              >
                                Sem conta
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="max-w-72">
                              <MembershipChips
                                memberships={person.memberships}
                              />
                            </div>
                          </TableCell>

                          {isAdmin ? (
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <PersonActions
                                  person={person}
                                  linkableMembers={linkableMembers}
                                  currentUserId={currentUserId}
                                />
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <ul className="divide-y md:hidden">
              {people.map((person) => {
                const role = person.userId
                  ? roleByUserId[person.userId]
                  : undefined;
                const birthdayLabel = formatOwnBirthday(
                  personDisplayBirthday(person),
                  isAdmin,
                );

                return (
                  <li key={person.id} className="space-y-3 px-4 py-4">
                    <Link
                      href={`/dashboard/members/${person.id}`}
                      className="group flex items-start gap-3"
                    >
                      <Avatar className="size-9 ring-1 ring-border group-hover:ring-primary transition-all">
                        <AvatarImage
                          src={personDisplayImage(person) ?? undefined}
                          alt={personDisplayName(person)}
                        />
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(personDisplayName(person))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-medium group-hover:text-primary group-hover:underline transition-colors">
                            {personDisplayName(person)}
                          </p>
                          {role ? (
                            <RoleBadge role={role} />
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-normal"
                            >
                              Sem conta
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {personDisplayEmail(person) ??
                            "Sem email cadastrado"}
                        </p>
                        {birthdayLabel ? (
                          <p className="text-[0.7rem] text-muted-foreground">
                            Aniversário: {birthdayLabel}
                          </p>
                        ) : null}
                      </div>
                    </Link>

                    <MembershipChips
                      memberships={person.memberships}
                      limit={3}
                    />

                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <PersonActions
                          person={person}
                          linkableMembers={linkableMembers}
                          currentUserId={currentUserId}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MembershipChips({
  memberships,
  limit = 2,
}: {
  memberships: PersonRecord["memberships"];
  limit?: number;
}) {
  if (memberships.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Sem departamento
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {memberships.slice(0, limit).map((membership) => {
        const functions = membership.assignments
          .map((assignment) => assignment.function.name)
          .join(", ");
        const label = `${membership.department.name}${
          functions ? ` · ${functions}` : ""
        }`;

        return (
          <span
            key={membership.id}
            title={label}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground"
          >
            {membership.isLeader ? (
              <CrownIcon className="size-3 shrink-0 text-accent-foreground" />
            ) : null}
            <span className="truncate">{label}</span>
          </span>
        );
      })}
      {memberships.length > limit ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
          +{memberships.length - limit}
        </span>
      ) : null}
    </div>
  );
}

function PersonActions({
  person,
  linkableMembers,
  currentUserId,
}: {
  person: PersonRecord;
  linkableMembers: LinkableMember[];
  currentUserId: string;
}) {
  const displayName = personDisplayName(person);
  const displayEmail = personDisplayEmail(person);

  return (
    <>
      <EditPersonDialog
        person={{
          id: person.id,
          name: person.name,
          email: person.email,
          phone: person.phone,
          birthday: person.birthday,
          userId: person.userId,
          user: person.user
            ? {
                name: person.user.name,
                email: person.user.email,
                birthday: person.user.birthday,
              }
            : null,
        }}
      />
      {person.userId && person.userId !== currentUserId ? (
        <ImpersonatePersonButton
          userId={person.userId}
          personName={displayName}
        />
      ) : null}
      {!person.userId && displayEmail ? (
        <InvitePersonDialog
          person={{
            id: person.id,
            name: displayName,
            email: displayEmail,
          }}
        />
      ) : null}
      {!person.userId ? (
        <LinkPersonDialog
          person={{
            id: person.id,
            name: displayName,
            email: displayEmail,
          }}
          availableMembers={linkableMembers}
        />
      ) : null}
      {!person.userId ? (
        <DeletePersonButton personId={person.id} personName={displayName} />
      ) : null}
    </>
  );
}

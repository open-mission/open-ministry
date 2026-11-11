import Link from "next/link";
import { ClockIcon, CrownIcon, SmartphoneIcon } from "lucide-react";

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
import type { DepartmentNomenclature } from "@/lib/church";
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
  terminology,
  pendingInvitationEmails,
}: {
  people: PersonRecord[];
  roleByUserId: Record<string, string>;
  linkableMembers: LinkableMember[];
  isAdmin: boolean;
  currentUserId: string;
  terminology?: DepartmentNomenclature;
  pendingInvitationEmails?: Set<string>;
}) {
  const groupWord = terminology?.plural.toLowerCase() ?? "departamentos";
  const possessive =
    terminology?.type === "teams" || terminology?.type === "networks"
      ? "suas"
      : "seus";
  const preposition = possessive === "suas" ? "das" : "dos";
  const scopeBadgeLabel = `${possessive.charAt(0).toUpperCase() + possessive.slice(1)} ${groupWord}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CardTitle className="font-heading text-xl tracking-tight">
              {isAdmin
                ? "Pessoas da igreja"
                : `Integrantes ${preposition} ${possessive} ${groupWord}`}
            </CardTitle>
            {!isAdmin ? (
              <Badge variant="secondary" className="text-xs font-normal">
                {scopeBadgeLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {people.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {isAdmin
              ? "Nenhuma pessoa cadastrada ainda."
              : `Nenhum integrante encontrado ${preposition} ${possessive} ${groupWord}.`}
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
                      <TableHead>
                        {terminology?.plural ?? "Departamentos"}
                      </TableHead>
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
                      const email = personDisplayEmail(person)?.toLowerCase();
                      const isPendingInvite = Boolean(
                        !role && email && pendingInvitationEmails?.has(email),
                      );
                      const birthdayLabel = formatOwnBirthday(
                        personDisplayBirthday(person),
                        isAdmin,
                      );

                      return (
                        <TableRow key={person.id}>
                          <TableCell>
                            <Link
                              href={`/dashboard/members/${person.id}`}
                              prefetch={true}
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
                            <div className="flex flex-col gap-1 items-start">
                              {role ? (
                                <RoleBadge role={role} />
                              ) : (
                                <>
                                  <Badge
                                    variant="outline"
                                    className="font-normal"
                                  >
                                    Sem conta
                                  </Badge>
                                  {isPendingInvite ? (
                                    <span
                                      title="Convite enviado e aguardando resposta"
                                      className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-amber-600 dark:text-amber-400"
                                    >
                                      <ClockIcon className="size-3 shrink-0" />
                                      Convite pendente
                                    </span>
                                  ) : null}
                                </>
                              )}
                              {person.user?.pwaInstalled ? (
                                <span
                                  title={`Aplicativo PWA instalado${person.user.pwaPlatform ? ` (${person.user.pwaPlatform.toUpperCase()})` : ""}`}
                                  className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-emerald-600 dark:text-emerald-400"
                                >
                                  <SmartphoneIcon className="size-3 shrink-0" />
                                  App PWA
                                </span>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="max-w-72">
                              <MembershipChips
                                memberships={person.memberships}
                                singularGroup={terminology?.singular.toLowerCase()}
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

            <ul className="space-y-2.5 p-3 md:hidden">
              {people.map((person) => {
                const role = person.userId
                  ? roleByUserId[person.userId]
                  : undefined;
                const email = personDisplayEmail(person)?.toLowerCase();
                const isPendingInvite = Boolean(
                  !role && email && pendingInvitationEmails?.has(email),
                );
                const birthdayLabel = formatOwnBirthday(
                  personDisplayBirthday(person),
                  isAdmin,
                );

                return (
                  <li
                    key={person.id}
                    className="overflow-hidden rounded-xl border border-border/60 bg-muted/15 p-3"
                  >
                    <Link
                      href={`/dashboard/members/${person.id}`}
                      prefetch={true}
                      className="group flex items-start gap-3"
                    >
                      <Avatar className="size-10 shrink-0 ring-1 ring-border transition-all group-hover:ring-primary">
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
                          <p className="text-sm font-medium transition-colors group-hover:text-primary group-hover:underline">
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
                          {isPendingInvite ? (
                            <span
                              title="Convite enviado e aguardando resposta"
                              className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            >
                              <ClockIcon className="size-2.5 shrink-0" />
                              Convite pendente
                            </span>
                          ) : null}
                          {person.user?.pwaInstalled ? (
                            <span
                              title={`Aplicativo PWA instalado${person.user.pwaPlatform ? ` (${person.user.pwaPlatform.toUpperCase()})` : ""}`}
                              className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            >
                              <SmartphoneIcon className="size-2.5 shrink-0" />
                              PWA
                            </span>
                          ) : null}
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

                    <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                      <div className="min-w-0 flex-1">
                        <MembershipChips
                          memberships={person.memberships}
                          limit={3}
                          singularGroup={terminology?.singular.toLowerCase()}
                        />
                      </div>

                      {isAdmin ? (
                        <div className="ml-auto flex shrink-0 items-center gap-0.5">
                          <PersonActions
                            person={person}
                            linkableMembers={linkableMembers}
                            currentUserId={currentUserId}
                          />
                        </div>
                      ) : null}
                    </div>
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
  singularGroup = "departamento",
}: {
  memberships: PersonRecord["memberships"];
  limit?: number;
  singularGroup?: string;
}) {
  if (memberships.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Sem {singularGroup}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
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
            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground"
          >
            {membership.isLeader ? (
              <CrownIcon className="size-3 shrink-0 text-accent-foreground" />
            ) : null}
            <span className="min-w-0 truncate">{label}</span>
          </span>
        );
      })}
      {memberships.length > limit ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
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
            phone: person.phone,
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

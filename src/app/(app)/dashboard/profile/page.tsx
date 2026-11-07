import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  CalendarDaysIcon,
  ChurchIcon,
  CrownIcon,
  MailIcon,
} from "lucide-react";

import { AssignmentList } from "@/components/app/assignment-list";
import { RoleBadge } from "@/components/members/role-badge";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPersonMemberships,
  getUpcomingAssignments,
} from "@/lib/agenda";
import {
  experienceLevelLabels,
  type ExperienceLevel,
} from "@/lib/experience";
import { formatDate, getInitials } from "@/lib/format";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  ensurePersonForUser,
  findPersonByUserId,
} from "@/lib/people";

export const metadata: Metadata = {
  title: "Perfil",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  await connection();

  const { organization, session, role } = await requireOrganizationContext();
  const person =
    (await findPersonByUserId(organization.id, session.user.id)) ??
    (await ensurePersonForUser(organization.id, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      birthday: session.user.birthday ?? null,
    }));

  if (!person) {
    notFound();
  }

  const [memberships, assignments] = await Promise.all([
    getPersonMemberships(person.id),
    getUpcomingAssignments(organization.id, person.id, 5),
  ]);
  const member = organization.members.find(
    (item) => item.userId === session.user.id,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Seu perfil
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Como você aparece em{" "}
          <span className="font-medium text-foreground">
            {organization.name}
          </span>
          , seus departamentos e as próximas escalas.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <Avatar className="size-20">
              <AvatarImage
                src={session.user.image ?? undefined}
                alt={session.user.name}
              />
              <AvatarFallback className="bg-primary/10 font-heading text-2xl text-primary">
                {getInitials(session.user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <p className="font-heading text-2xl leading-tight tracking-tight">
                {session.user.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {session.user.email}
              </p>
            </div>

            <RoleBadge role={role} />

            <div className="w-full space-y-2 border-t pt-4 text-left text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <ChurchIcon className="size-3.5 shrink-0" />
                <span className="truncate">{organization.name}</span>
              </p>
              <p className="flex items-center gap-2">
                <MailIcon className="size-3.5 shrink-0" />
                <span className="truncate">{session.user.email}</span>
              </p>
              {member ? (
                <p className="flex items-center gap-2">
                  <CalendarDaysIcon className="size-3.5 shrink-0" />
                  Na igreja desde {formatDate(member.createdAt)}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight">
                Dados pessoais
              </CardTitle>
              <CardDescription>
                Nome, email, aniversário e foto do perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileEditor
                name={session.user.name}
                email={session.user.email}
                birthday={session.user.birthday ?? null}
                image={session.user.image ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight">
                Meus departamentos
              </CardTitle>
              <CardDescription>
                Onde você serve e as funções que exerce.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberships.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Você ainda não faz parte de um departamento.
                </p>
              ) : (
                <ul className="space-y-3">
                  {memberships.map((membership) => (
                    <li
                      key={membership.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">
                          {membership.department.name}
                        </p>
                        {membership.isLeader ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 font-normal"
                          >
                            <CrownIcon className="size-3" />
                            Líder
                          </Badge>
                        ) : null}
                      </div>

                      {membership.assignments.length === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Nenhuma função atribuída.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {membership.assignments.map((assignment) => (
                            <span
                              key={assignment.id}
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              {assignment.function.name}
                              <span className="font-normal text-muted-foreground">
                                {" · "}
                                {experienceLevelLabels[
                                  assignment.experienceLevel as ExperienceLevel
                                ] ?? assignment.experienceLevel}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight">
                Minhas próximas escalas
              </CardTitle>
              <CardDescription>
                Os encontros em que você vai atuar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma escala futura.
                </p>
              ) : (
                <AssignmentList assignments={assignments} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Skeleton className="h-80 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

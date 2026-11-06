import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { InviteDialog } from "@/components/members/invite-dialog";
import { PendingInvitations } from "@/components/members/pending-invitations";
import { CreatePersonDialog } from "@/components/people/create-person-dialog";
import { PeopleTable } from "@/components/people/people-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";

export const metadata: Metadata = {
  title: "Pessoas",
};

export default function MembersPage() {
  return (
    <Suspense fallback={<MembersSkeleton />}>
      <MembersContent />
    </Suspense>
  );
}

async function MembersContent() {
  await connection();

  const { organization, isAdmin, session } =
    await requireOrganizationContext();
  const people = await listPeople(organization.id);
  const roleByUserId = Object.fromEntries(
    organization.members.map((member) => [
      member.userId,
      member.role,
    ]),
  );
  const linkedUserIds = new Set(
    people
      .map((person) => person.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
  const linkableMembers = organization.members
    .filter((member) => !linkedUserIds.has(member.userId))
    .map((member) => ({
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Pessoas
            </p>
            <Badge variant="outline" className="font-normal">
              {people.length}
            </Badge>
          </div>
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Sua equipe
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Veja quem faz parte de{" "}
            <span className="font-medium text-foreground">
              {organization.name}
            </span>
            , com ou sem conta. Administradores também podem cadastrar pessoas,
            convidar e vincular contas.
          </p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <CreatePersonDialog />
            <InviteDialog variant="outline" />
          </div>
        ) : null}
      </header>

      <PeopleTable
        people={people}
        roleByUserId={roleByUserId}
        linkableMembers={linkableMembers}
        isAdmin={isAdmin}
        currentUserId={session.user.id}
      />

      {isAdmin ? (
        <PendingInvitations invitations={organization.invitations} />
      ) : null}
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

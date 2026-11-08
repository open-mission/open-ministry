import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { SparklesIcon, UsersIcon } from "lucide-react";

import { FelicitometroDashboard } from "@/components/felicitometro/felicitometro-dashboard";
import { InviteDialog } from "@/components/members/invite-dialog";
import { PendingInvitations } from "@/components/members/pending-invitations";
import { CreatePersonDialog } from "@/components/people/create-person-dialog";
import { PeopleTable } from "@/components/people/people-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPersonMemberships } from "@/lib/agenda";
import { getDepartmentTerminology, parseChurchMetadata } from "@/lib/church";
import { listUserLeaderDepartments } from "@/lib/departments";
import { getOrganizationMoodOverview } from "@/lib/felicitometro";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId, listPeople } from "@/lib/people";

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

  const moodOverviewPromise = isAdmin
    ? getOrganizationMoodOverview({
        organizationId: organization.id,
        viewerUserId: session.user.id,
        isAdmin: true,
      })
    : null;

  const [allPeople, leaderDepartments] = await Promise.all([
    listPeople(organization.id),
    isAdmin
      ? Promise.resolve([])
      : listUserLeaderDepartments(organization.id, session.user.id),
  ]);

  const churchMeta = parseChurchMetadata(organization.metadata);
  const terminology = getDepartmentTerminology(churchMeta);

  let people = allPeople;

  if (!isAdmin) {
    const currentPerson =
      allPeople.find((person) => person.userId === session.user.id) ??
      (await findPersonByUserId(organization.id, session.user.id));

    const userDepartmentIds = new Set<string>();

    if (currentPerson) {
      if (
        "memberships" in currentPerson &&
        Array.isArray(currentPerson.memberships)
      ) {
        for (const m of currentPerson.memberships) {
          userDepartmentIds.add(m.departmentId);
        }
      } else {
        const memberships = await getPersonMemberships(currentPerson.id);
        for (const m of memberships) {
          userDepartmentIds.add(m.departmentId);
        }
      }
    }

    for (const ld of leaderDepartments) {
      userDepartmentIds.add(ld.id);
    }

    people = allPeople.filter(
      (person) =>
        person.id === currentPerson?.id ||
        person.userId === session.user.id ||
        person.memberships.some((m) => userDepartmentIds.has(m.departmentId)),
    );
  }

  const canViewFelicitometro = isAdmin || leaderDepartments.length > 0;
  const moodOverview = isAdmin
    ? await moodOverviewPromise
    : canViewFelicitometro
      ? await getOrganizationMoodOverview({
          organizationId: organization.id,
          viewerUserId: session.user.id,
          isAdmin: false,
        })
      : null;

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
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Pessoas
          </p>
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Sua equipe
          </h1>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <CreatePersonDialog />
            <InviteDialog variant="outline" />
          </div>
        ) : null}
      </header>

      {canViewFelicitometro && moodOverview ? (
        <Tabs defaultValue="list" className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 max-w-xs h-11 bg-muted/60 p-1">
            <TabsTrigger value="list" className="text-xs font-medium gap-2">
              <UsersIcon className="size-4" />
              Pessoas ({people.length})
            </TabsTrigger>
            <TabsTrigger
              value="felicitometro"
              className="text-xs font-medium gap-2 relative"
            >
              <SparklesIcon className="size-4" />
              Felicitômetro
              {moodOverview.prayerRequestsCount > 0 ||
              moodOverview.talkRequestsCount > 0 ? (
                <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-8">
            <PeopleTable
              people={people}
              roleByUserId={roleByUserId}
              linkableMembers={linkableMembers}
              isAdmin={isAdmin}
              currentUserId={session.user.id}
              terminology={terminology}
            />

            {isAdmin ? (
              <PendingInvitations invitations={organization.invitations} />
            ) : null}
          </TabsContent>

          <TabsContent value="felicitometro" className="space-y-6">
            <FelicitometroDashboard overview={moodOverview} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <PeopleTable
            people={people}
            roleByUserId={roleByUserId}
            linkableMembers={linkableMembers}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
            terminology={terminology}
          />

          {isAdmin ? (
            <PendingInvitations invitations={organization.invitations} />
          ) : null}
        </>
      )}
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

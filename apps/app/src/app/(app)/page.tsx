import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  DesktopHomeView,
  HomeSkeleton,
  MobileHomeView,
  TasksCard,
  VerseCard,
  VerseCardSkeleton,
  type HomeEventSummary,
} from "@/components/home";
import { getMyAvailabilityAction } from "@/app/actions/availability";
import { listTasks } from "@/features/tasks";
import {
  getDepartmentAgenda,
  getPersonMembershipsForUser,
  getUpcomingAssignments,
} from "@/lib/agenda";
import type { MyAvailabilityResult } from "@/lib/availability";
import {
  buildBirthdayEntries,
  getTodayInSaoPaulo,
} from "@/lib/birthdays";
import { listDepartments } from "@/lib/departments";
import {
  buildDepartmentCoverage,
  listUpcomingEvents,
  splitEvents,
} from "@/lib/events";
import { formatHomeDateLabel, getHomeGreeting } from "@/lib/home-greeting";
import { getUserAccessibleModuleKeys } from "@/lib/modules/service";
import { getUnreadAnnouncements } from "@/lib/notifications";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  ensurePersonForUser,
  findPersonByUserId,
  listPeopleSummary,
  personDisplayName,
} from "@/lib/people";
import { can } from "@/lib/permissions/service";
import {
  getCachedVerseOfTheDay,
  type VerseOfTheDayData,
} from "@/lib/youversion";

export const metadata: Metadata = {
  title: "Início",
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  await connection();

  const { organization, session, isAdmin } = await requireOrganizationContext();
  const today = getTodayInSaoPaulo();
  const greeting = getHomeGreeting();
  const dateLabel = formatHomeDateLabel();

  // Inicia a busca do versículo cedo, mas a renderização acontece em um
  // limite de Suspense próprio para não bloquear o restante da home.
  const votdPromise = getCachedVerseOfTheDay();

  const [
    people,
    initialPerson,
    unreadAnnouncements,
    events,
    adminDepartments,
    accessibleModuleKeys,
    memberships,
    manageOwnAvailability,
  ] = await Promise.all([
    listPeopleSummary(organization.id),
    findPersonByUserId(organization.id, session.user.id),
    getUnreadAnnouncements(organization.id, session.user.id, 5),
    listUpcomingEvents(organization.id, 8),
    isAdmin ? listDepartments(organization.id) : Promise.resolve([]),
    getUserAccessibleModuleKeys(organization.id, session.user.id, isAdmin),
    getPersonMembershipsForUser(organization.id, session.user.id),
    can("schedules", "manageOwnAvailability"),
  ]);

  const person =
    initialPerson ??
    (await ensurePersonForUser(organization.id, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      birthday: session.user.birthday ?? null,
    }));

  const memberDepartmentIds = memberships.map(
    (membership) => membership.departmentId,
  );
  const ledDepartmentIds = memberships
    .filter((membership) => membership.isLeader)
    .map((membership) => membership.departmentId);

  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let departmentAgenda: Awaited<ReturnType<typeof getDepartmentAgenda>> = [];
  let upcomingAssignments: Awaited<ReturnType<typeof getUpcomingAssignments>> =
    [];
  let availability: MyAvailabilityResult | null = null;
  const canManageOwnAvailability = manageOwnAvailability;

  if (person) {
    // A disponibilidade é opcional: só é consultada para quem pode gerenciá-la.
    [tasks, departmentAgenda, upcomingAssignments, availability] =
      await Promise.all([
        listTasks({
          organizationId: organization.id,
          userId: session.user.id,
          isAdmin,
          ledDepartmentIds,
          memberDepartmentIds,
          filter: { status: "active", tab: "personal" },
        }),
        getDepartmentAgenda(organization.id, person.id, 6),
        getUpcomingAssignments(organization.id, person.id, 3),
        canManageOwnAvailability
          ? getMyAvailabilityAction().catch(() => null)
          : Promise.resolve(null),
      ]);
  }

  // Preserva a privacidade dos membros: administradores veem todas as pessoas,
  // demais perfis veem a si mesmos e pessoas dos seus departamentos.
  const visiblePeople = isAdmin
    ? people
    : people.filter(
        (personRecord) =>
          personRecord.id === person?.id ||
          personRecord.memberships.some((membership) =>
            memberDepartmentIds.includes(membership.departmentId),
          ),
      );

  const birthdayEntries = buildBirthdayEntries(visiblePeople, {
    includeAge: false,
    today,
  });

  const taskDepartments = memberships.map((membership) => ({
    id: membership.departmentId,
    name: membership.department.name,
  }));
  const taskMembers = visiblePeople
    .filter((personRecord) =>
      Boolean(personRecord.userId || personRecord.user?.id),
    )
    .map((personRecord) => ({
      id: personRecord.id,
      userId: personRecord.userId ?? personRecord.user?.id ?? "",
      personId: personRecord.id,
      name: personDisplayName(personRecord),
      email: personRecord.email ?? personRecord.user?.email ?? null,
    }));

  const { upcoming } = splitEvents(events);
  const featuredEvent = upcoming[0] ?? null;

  const departmentEvents = departmentAgenda.map((item) => item.event);
  // Administradores acompanham a agenda geral; membros veem primeiro os
  // encontros dos seus departamentos, com fallback para a agenda da igreja.
  const homeEventsSource =
    !isAdmin && departmentEvents.length > 0 ? departmentEvents : upcoming;
  const homeEvents: HomeEventSummary[] = homeEventsSource
    .slice(0, 4)
    .map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location ?? null,
    }));

  const nextAssignment = upcomingAssignments[0] ?? null;

  const canManageSchedules = isAdmin || ledDepartmentIds.length > 0;
  const attentionDepartments = canManageSchedules
    ? isAdmin
      ? adminDepartments.map((department) => ({
          id: department.id,
          name: department.name,
        }))
      : memberships
          .filter((membership) => membership.isLeader)
          .map((membership) => ({
            id: membership.departmentId,
            name: membership.department.name,
          }))
    : [];
  const weekCoverage = canManageSchedules
    ? buildDepartmentCoverage(
        // Ensaios têm fluxo próprio e não entram na cobertura de escalas.
        upcoming.filter((event) => event.kind !== "rehearsal"),
        attentionDepartments,
      )
    : [];

  const displayName = person
    ? personDisplayName(person)
    : (session.user.name ?? "amigo");
  const firstName =
    displayName.trim().split(/\s+/)[0] || displayName || "amigo";

  const renderTasksCard = (variant: "card" | "folio") => (
    <TasksCard
      tasks={tasks}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
      ledDepartmentIds={ledDepartmentIds}
      memberDepartmentIds={memberDepartmentIds}
      departments={taskDepartments}
      members={taskMembers}
      variant={variant}
      showEmptyState
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl pb-4">
      <div className="lg:hidden">
        <MobileHomeView
          organizationName={organization.name}
          greeting={greeting}
          firstName={firstName}
          hideHeader
          nextAssignment={nextAssignment}
          featuredEvent={featuredEvent}
          canManageOwnAvailability={canManageOwnAvailability}
          availability={availability}
          canManageSchedules={canManageSchedules}
          weekCoverage={weekCoverage}
          accessibleModuleKeys={accessibleModuleKeys}
          notifications={unreadAnnouncements}
          events={homeEvents}
          tasksSlot={renderTasksCard("card")}
          verseSlot={
            <Suspense fallback={<VerseCardSkeleton variant="compact" />}>
              <VerseSection votdPromise={votdPromise} variant="compact" />
            </Suspense>
          }
        />
      </div>

      <div className="hidden lg:block">
        <DesktopHomeView
          organizationName={organization.name}
          greeting={greeting}
          firstName={firstName}
          dateLabel={dateLabel}
          nextAssignment={nextAssignment}
          featuredEvent={featuredEvent}
          canManageOwnAvailability={canManageOwnAvailability}
          availability={availability}
          canManageSchedules={canManageSchedules}
          weekCoverage={weekCoverage}
          notifications={unreadAnnouncements}
          events={homeEvents}
          birthdays={birthdayEntries}
          today={today}
          tasksSlot={renderTasksCard("folio")}
          verseSlot={
            <Suspense fallback={<VerseCardSkeleton />}>
              <VerseSection votdPromise={votdPromise} variant="folio" />
            </Suspense>
          }
        />
      </div>
    </div>
  );
}

async function VerseSection({
  votdPromise,
  variant = "full",
}: {
  votdPromise: Promise<VerseOfTheDayData>;
  variant?: "compact" | "folio" | "full";
}) {
  const verse = await votdPromise;
  return <VerseCard verse={verse} variant={variant} />;
}

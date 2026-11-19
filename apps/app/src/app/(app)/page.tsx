import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  BirthdaysCard,
  ChurchInfoCard,
  DepartmentsCard,
  HomeGrid,
  HomeSkeleton,
  HomeTabs,
  NextServiceCard,
  NotificationsCard,
  TasksCard,
  UpcomingEventsCard,
  VerseCard,
  VerseCardSkeleton,
  type ServedDepartment,
} from "@/components/home";
import { listTasks } from "@/features/tasks";
import {
  getDepartmentAgenda,
  getPersonMembershipsForUser,
} from "@/lib/agenda";
import { buildBirthdayEntries, getTodayInSaoPaulo } from "@/lib/birthdays";
import { getDepartmentTerminology, parseChurchMetadata } from "@/lib/church";
import { listUpcomingEvents, splitEvents } from "@/lib/events";
import { getUnreadAnnouncements } from "@/lib/notifications";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  ensurePersonForUser,
  findPersonByUserId,
  listPeopleSummary,
  personDisplayName,
  personDisplayImage,
} from "@/lib/people";
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
  const churchMeta = parseChurchMetadata(organization.metadata);
  const terminology = getDepartmentTerminology(churchMeta);
  const today = getTodayInSaoPaulo();

  // Inicia a busca do versículo cedo, mas a renderização acontece em um
  // limite de Suspense próprio para não bloquear o restante da home.
  const votdPromise = getCachedVerseOfTheDay();

  const [people, initialPerson, unreadAnnouncements, events] =
    await Promise.all([
      listPeopleSummary(organization.id),
      findPersonByUserId(organization.id, session.user.id),
      getUnreadAnnouncements(organization.id, session.user.id, 5),
      listUpcomingEvents(organization.id, 8),
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

  const memberships = await getPersonMembershipsForUser(
    organization.id,
    session.user.id,
  );
  const memberDepartmentIds = memberships.map(
    (membership) => membership.departmentId,
  );
  const ledDepartmentIds = memberships
    .filter((membership) => membership.isLeader)
    .map((membership) => membership.departmentId);

  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let departmentAgenda: Awaited<ReturnType<typeof getDepartmentAgenda>> = [];

  if (person) {
    [tasks, departmentAgenda] = await Promise.all([
      listTasks({
        organizationId: organization.id,
        userId: session.user.id,
        isAdmin,
        ledDepartmentIds,
        memberDepartmentIds,
        filter: { status: "active", tab: "personal" },
      }),
      getDepartmentAgenda(organization.id, person.id, 6),
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
  const leaderIds = people
    .filter((personRecord) =>
      personRecord.memberships.some((membership) => membership.isLeader),
    )
    .map((personRecord) => personRecord.id);

  const servedDepartments: ServedDepartment[] = memberships.map(
    (membership) => {
      const departmentPeople = people.filter((personRecord) =>
        personRecord.memberships.some(
          (item) => item.departmentId === membership.departmentId,
        ),
      );
      const functions = Array.from(
        new Set(
          membership.assignments
            .map((assignment) => assignment.function?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      );

      return {
        id: membership.departmentId,
        name: membership.department.name,
        description: membership.department.description,
        functions,
        memberCount: departmentPeople.length,
        memberAvatars: departmentPeople.slice(0, 4).map((personRecord) => ({
          id: personRecord.id,
          name: personDisplayName(personRecord),
          image: personDisplayImage(personRecord),
        })),
      };
    },
  );

  const { upcoming } = splitEvents(events);
  const featuredEvent = upcoming[0] ?? null;

  const departmentEvents = departmentAgenda.map((item) => item.event);
  const upcomingEvents =
    !isAdmin && departmentEvents.length > 0
      ? departmentEvents.slice(0, 5)
      : upcoming.slice(1, 5);

  const todayContent = (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<VerseCardSkeleton />}>
        <VerseSection votdPromise={votdPromise} />
      </Suspense>

      <HomeGrid>
        <NextServiceCard event={featuredEvent} />
        <NotificationsCard announcements={unreadAnnouncements} />
      </HomeGrid>

      <HomeGrid>
        <TasksCard tasks={tasks} />
        <BirthdaysCard
          entries={birthdayEntries}
          today={today}
          leaderIds={leaderIds}
        />
      </HomeGrid>
    </div>
  );

  const churchContent = (
    <div className="flex flex-col gap-8">
      <DepartmentsCard
        departments={servedDepartments}
        pluralLabel={terminology.plural}
      />

      <HomeGrid>
        <ChurchInfoCard
          organization={{ name: organization.name, logo: organization.logo }}
          churchMeta={churchMeta}
        />
        <UpcomingEventsCard events={upcomingEvents} />
      </HomeGrid>
    </div>
  );

  return <HomeTabs today={todayContent} church={churchContent} />;
}

async function VerseSection({
  votdPromise,
}: {
  votdPromise: Promise<VerseOfTheDayData>;
}) {
  const verse = await votdPromise;
  return <VerseCard verse={verse} />;
}

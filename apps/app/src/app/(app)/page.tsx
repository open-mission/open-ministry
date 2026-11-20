import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  BirthdaysCard,
  birthdaysForCurrentMonth,
  ChurchInfoCard,
  DepartmentsCard,
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
        new Map(
          membership.assignments
            .filter((assignment) => Boolean(assignment.function))
            .map((assignment) => {
              const departmentFunction = assignment.function!;
              return [
                departmentFunction.id,
                { id: departmentFunction.id, name: departmentFunction.name },
              ] as const;
            }),
        ).values(),
      );
      const members = departmentPeople.map((personRecord) => ({
        id: personRecord.id,
        isLeader: personRecord.memberships.some(
          (item) =>
            item.isLeader && item.departmentId === membership.departmentId,
        ),
        person: personRecord,
      }));

      return {
        id: membership.departmentId,
        name: membership.department.name,
        description: membership.department.description,
        functions,
        members,
      };
    },
  );

  const taskDepartments = servedDepartments.map(({ id, name }) => ({
    id,
    name,
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
  const upcomingEvents =
    !isAdmin && departmentEvents.length > 0
      ? departmentEvents.slice(0, 5)
      : upcoming.slice(1, 5);

  const hasActiveTasks = tasks.some(
    (task) => task.status === "todo" || task.status === "in_progress",
  );
  const hasBirthdays =
    birthdaysForCurrentMonth(birthdayEntries, today).length > 0;
  const hasSideColumn = hasActiveTasks || hasBirthdays;

  const verseSection = (
    <Suspense fallback={<VerseCardSkeleton />}>
      <VerseSection votdPromise={votdPromise} />
    </Suspense>
  );

  const todayContent = hasSideColumn ? (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      <div className="flex flex-col gap-6 lg:col-span-7">
        {verseSection}
        <NextServiceCard event={featuredEvent} />
        <NotificationsCard announcements={unreadAnnouncements} />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-5">
        <TasksCard
          tasks={tasks}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          ledDepartmentIds={ledDepartmentIds}
          memberDepartmentIds={memberDepartmentIds}
          departments={taskDepartments}
          members={taskMembers}
        />
        <BirthdaysCard
          entries={birthdayEntries}
          today={today}
          leaderIds={leaderIds}
        />
      </div>
    </div>
  ) : (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="mx-auto w-full max-w-4xl">{verseSection}</div>
      <div
        className={
          featuredEvent && unreadAnnouncements.length > 0
            ? "grid grid-cols-1 gap-6 md:grid-cols-2"
            : "flex flex-col gap-6"
        }
      >
        <NextServiceCard event={featuredEvent} />
        <NotificationsCard announcements={unreadAnnouncements} />
      </div>
    </div>
  );

  const churchContent =
    upcomingEvents.length > 0 ? (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <ChurchInfoCard
              organization={{ name: organization.name, logo: organization.logo }}
              churchMeta={churchMeta}
            />
          </div>
          <div className="lg:col-span-7">
            <UpcomingEventsCard events={upcomingEvents} />
          </div>
        </div>
        <DepartmentsCard
          departments={servedDepartments}
          pluralLabel={terminology.plural}
        />
      </div>
    ) : (
      <div className="flex flex-col gap-6">
        <div className="w-full max-w-3xl">
          <ChurchInfoCard
            organization={{ name: organization.name, logo: organization.logo }}
            churchMeta={churchMeta}
          />
        </div>
        <DepartmentsCard
          departments={servedDepartments}
          pluralLabel={terminology.plural}
        />
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-4">
      <HomeTabs today={todayContent} church={churchContent} />
    </div>
  );
}

async function VerseSection({
  votdPromise,
}: {
  votdPromise: Promise<VerseOfTheDayData>;
}) {
  const verse = await votdPromise;
  return <VerseCard verse={verse} />;
}

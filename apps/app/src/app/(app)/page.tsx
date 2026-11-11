import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  LayersIcon,
  MailIcon,
  UsersIcon,
} from "lucide-react";

import { MemberDashboard } from "@/components/app/member-dashboard";
import { StatStrip } from "@/components/app/stat-strip";
import { BirthdaysCard } from "@/components/birthdays/birthdays-card";
import { FeaturedServiceCard } from "@/components/dashboard/featured-service-card";
import { PastoralCarePreview } from "@/components/dashboard/pastoral-care-preview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentPeopleCarousel } from "@/components/dashboard/recent-people-carousel";
import { UpcomingServicesCarousel } from "@/components/dashboard/upcoming-services-carousel";
import { VerseOfTheDayCard } from "@/components/dashboard/verse-of-the-day-card";
import { UnreadAnnouncementsWidget } from "@/components/dashboard/unread-announcements-widget";
import { FelicitometroCard } from "@/components/felicitometro/felicitometro-card";
import { InviteDialog } from "@/components/members/invite-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDepartmentAgenda,
  getPersonMembershipsForUser,
  getUpcomingAssignments,
} from "@/lib/agenda";
import {
  buildBirthdayEntries,
  getTodayInSaoPaulo,
} from "@/lib/birthdays";
import { getDepartmentTerminology, parseChurchMetadata } from "@/lib/church";
import { listDepartmentOptions } from "@/lib/departments";
import { listUpcomingEvents, splitEvents, toInputDate } from "@/lib/events";
import {
  getOrganizationMoodOverview,
  getTodayMoodForPerson,
} from "@/lib/felicitometro";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";
import { getUnreadAnnouncements } from "@/lib/notifications";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  ensurePersonForUser,
  findPersonByUserId,
  listPeopleSummary,
  personDisplayName,
} from "@/lib/people";
import { getCachedVerseOfTheDay, type VerseOfTheDayData } from "@/lib/youversion";

export const metadata: Metadata = {
  title: "Visão geral",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();

  const { organization, session, isAdmin } = await requireOrganizationContext();
  const firstName = session.user.name.trim().split(/\s+/)[0] ?? "líder";
  const churchMeta = parseChurchMetadata(organization.metadata);
  const departmentTerminology = getDepartmentTerminology(churchMeta);

  const membershipsPromise = !isAdmin
    ? getPersonMembershipsForUser(organization.id, session.user.id)
    : Promise.resolve([]);

  // Start the verse fetch immediately but do not await it here: it is rendered
  // inside its own Suspense boundary so a slow YouVersion API never holds the
  // dashboard shell.
  const votdPromise = getCachedVerseOfTheDay();

  const [people, initialPerson, unreadAnnouncements] = await Promise.all([
    listPeopleSummary(organization.id),
    findPersonByUserId(organization.id, session.user.id),
    getUnreadAnnouncements(organization.id, session.user.id, 5),
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

  // When the person record already existed the memberships were loaded in
  // parallel above. A freshly linked person needs a new lookup because the
  // earlier fetch may have run before the link invalidated the cache.
  const memberships = !isAdmin
    ? initialPerson
      ? await membershipsPromise
      : person
        ? await getPersonMembershipsForUser(organization.id, session.user.id)
        : []
    : [];
  const isLeader = memberships.some((membership) => membership.isLeader);

  if (!isAdmin && !isLeader) {
    const [assignments, agenda, todayMood] = person
      ? await Promise.all([
          getUpcomingAssignments(organization.id, person.id),
          getDepartmentAgenda(organization.id, person.id),
          getTodayMoodForPerson(organization.id, person.id),
        ])
      : [[], [], null];

    const memberDepartmentIds = new Set(
      memberships.map((membership) => membership.departmentId),
    );
    const visiblePeople = people.filter(
      (personRecord) =>
        personRecord.id === person?.id ||
        personRecord.memberships.some((membership) =>
          memberDepartmentIds.has(membership.departmentId),
        ),
    );
    const birthdayEntries = buildBirthdayEntries(visiblePeople, {
      includeAge: false,
      today: getTodayInSaoPaulo(),
    });

    return (
      <MemberDashboard
        firstName={firstName}
        organizationName={organization.name}
        birthdayEntries={birthdayEntries}
        memberships={memberships}
        assignments={assignments}
        agenda={agenda}
        initialMood={todayMood}
        terminology={departmentTerminology}
        votdSlot={
          <Suspense fallback={<VerseOfTheDayCardSkeleton />}>
            <VerseOfTheDaySection votdPromise={votdPromise} />
          </Suspense>
        }
        unreadAnnouncements={unreadAnnouncements}
      />
    );
  }

  // Dados para administradores e líderes: carregamento 100% paralelo com caching de alta performance
  const [events, departments, evolutionResult, moodOverview, todayMood] =
    await Promise.all([
      listUpcomingEvents(organization.id, 8),
      listDepartmentOptions(organization.id),
      getOrganizationEvolutionConfig(organization.id),
      getOrganizationMoodOverview({
        organizationId: organization.id,
        viewerUserId: session.user.id,
        isAdmin,
        days: 14,
      }),
      person
        ? getTodayMoodForPerson(organization.id, person.id)
        : Promise.resolve(null),
    ]);

  const birthdayEntries = buildBirthdayEntries(people, {
    includeAge: true,
    today: getTodayInSaoPaulo(),
  });

  const { upcoming } = splitEvents(events);
  const featuredEvent = upcoming[0] ?? null;
  const otherUpcomingEvents = upcoming.slice(1, 7);

  const departmentOptions = departments;

  const peopleOptions = people.map((p) => ({
    id: p.id,
    name: personDisplayName(p),
    phone: p.phone,
    hasAccount: Boolean(p.userId),
  }));

  const isWhatsAppConfigured = Boolean(evolutionResult?.config);
  const defaultDate = toInputDate(new Date());

  const members = organization.members;
  const roleByUserId = new Map(
    members.map((member) => [member.userId, member.role]),
  );
  const pendingInvitations = organization.invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  const recentPeople = [...people]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-4 sm:gap-12">
      {/* Cabeçalho da Home */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-[2.15rem] leading-none tracking-tight text-balance sm:text-4xl">
            Olá, {firstName}.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Aqui está o panorama de{" "}
            <span className="font-medium text-foreground">
              {organization.name}
            </span>{" "}
            hoje.
          </p>
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <InviteDialog />
          </div>
        ) : null}
      </header>

      {/* 1. Versículo do Dia (YouVersion) */}
      <Suspense fallback={<VerseOfTheDayCardSkeleton />}>
        <VerseOfTheDaySection votdPromise={votdPromise} />
      </Suspense>

      {/* 2. Últimos avisos não lidos */}
      {unreadAnnouncements.length > 0 && (
        <UnreadAnnouncementsWidget initialAnnouncements={unreadAnnouncements} />
      )}

      {/* 3. Atalhos Rápidos com Scroll Horizontal no Mobile */}
      <QuickActions
        isAdmin={isAdmin}
        departments={departmentOptions}
        people={peopleOptions}
        isWhatsAppConfigured={isWhatsAppConfigured}
        defaultDate={defaultDate}
        terminology={departmentTerminology}
      />

      {/* 2. Próximo Culto em Destaque */}
      <section aria-labelledby="next-service-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="next-service-heading"
            className="font-heading text-lg leading-none tracking-tight sm:text-xl"
          >
            Próximo encontro
          </h2>
          <Link
            href="/dashboard/events"
            prefetch={true}
            className="group inline-flex items-center gap-1 pb-0.5 text-xs font-medium text-primary hover:underline"
          >
            Ver agenda
            <ArrowRightIcon
              data-icon="inline-end"
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
        <FeaturedServiceCard event={featuredEvent} isAdmin={isAdmin} />
      </section>

      {/* 3. Próximos Cultos e Eventos (Carrossel Horizontal) */}
      {otherUpcomingEvents.length > 0 && (
        <UpcomingServicesCarousel events={otherUpcomingEvents} />
      )}

      {/* 4 e 5. Felicitômetro Pessoal & Cuidado Pastoral (50% no Desktop, lado a lado) */}
      <section
        aria-label="Cuidado pastoral e felicitômetro"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
      >
        <FelicitometroCard initialMood={todayMood} userName={firstName} />
        <PastoralCarePreview overview={moodOverview} />
      </section>

      {/* 6. Indicadores Gerais da Igreja */}
      <StatStrip
        items={[
          {
            icon: UsersIcon,
            label: "Pessoas",
            value: people.length,
            hint: "fazem parte da igreja",
          },
          {
            icon: LayersIcon,
            label: "Ministérios",
            value: departments.length,
            hint: "departamentos ativos",
          },
          {
            icon: MailIcon,
            label: "Convites pendentes",
            value: pendingInvitations.length,
            hint: "aguardando resposta",
          },
        ]}
      />

      {/* 7. Aniversariantes do Mês */}
      <BirthdaysCard entries={birthdayEntries} />

      {/* 8. Pessoas Recentes (Carrossel Horizontal / Grid) */}
      <RecentPeopleCarousel
        people={recentPeople}
        roleByUserId={roleByUserId}
      />
    </div>
  );
}

async function VerseOfTheDaySection({
  votdPromise,
}: {
  votdPromise: Promise<VerseOfTheDayData>;
}) {
  const votd = await votdPromise;
  return <VerseOfTheDayCard verse={votd} />;
}

function VerseOfTheDayCardSkeleton() {
  return (
    <div
      className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

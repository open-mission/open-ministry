import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  LayersIcon,
  MailIcon,
  UsersIcon,
} from "lucide-react";

import { MemberDashboard } from "@/components/app/member-dashboard";
import { StatCard } from "@/components/app/stat-card";
import { BirthdaysCard } from "@/components/birthdays/birthdays-card";
import { FeaturedServiceCard } from "@/components/dashboard/featured-service-card";
import { PastoralCarePreview } from "@/components/dashboard/pastoral-care-preview";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentPeopleCarousel } from "@/components/dashboard/recent-people-carousel";
import { UpcomingServicesCarousel } from "@/components/dashboard/upcoming-services-carousel";
import { FelicitometroCard } from "@/components/felicitometro/felicitometro-card";
import { InviteDialog } from "@/components/members/invite-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDepartmentAgenda,
  getPersonMemberships,
  getUpcomingAssignments,
} from "@/lib/agenda";
import {
  buildBirthdayEntries,
  getTodayInSaoPaulo,
} from "@/lib/birthdays";
import { listDepartments } from "@/lib/departments";
import { listEvents, splitEvents, toInputDate } from "@/lib/events";
import {
  getOrganizationMoodOverview,
  getTodayMoodForPerson,
} from "@/lib/felicitometro";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  ensurePersonForUser,
  findPersonByUserId,
  listPeople,
  personDisplayName,
} from "@/lib/people";

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

  const people = await listPeople(organization.id);
  const firstName = session.user.name.trim().split(/\s+/)[0] ?? "líder";
  const birthdayEntries = buildBirthdayEntries(people, {
    includeAge: isAdmin,
    today: getTodayInSaoPaulo(),
  });

  if (!isAdmin) {
    const person =
      (await findPersonByUserId(organization.id, session.user.id)) ??
      (await ensurePersonForUser(organization.id, {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        birthday: session.user.birthday ?? null,
      }));

    const [memberships, assignments, agenda, todayMood] = person
      ? await Promise.all([
          getPersonMemberships(person.id),
          getUpcomingAssignments(organization.id, person.id),
          getDepartmentAgenda(organization.id, person.id),
          getTodayMoodForPerson(organization.id, person.id),
        ])
      : [[], [], [], null];

    return (
      <MemberDashboard
        firstName={firstName}
        organizationName={organization.name}
        peopleCount={people.length}
        birthdayEntries={birthdayEntries}
        memberships={memberships}
        assignments={assignments}
        agenda={agenda}
        initialMood={todayMood}
      />
    );
  }

  // Dados exclusivos para administradores e líderes
  const [events, departments, evolutionResult, moodOverview] =
    await Promise.all([
      listEvents(organization.id),
      listDepartments(organization.id),
      getOrganizationEvolutionConfig(organization.id),
      getOrganizationMoodOverview({
        organizationId: organization.id,
        viewerUserId: session.user.id,
        isAdmin: true,
        days: 14,
      }),
    ]);

  const adminPerson =
    (await findPersonByUserId(organization.id, session.user.id)) ??
    (await ensurePersonForUser(organization.id, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      birthday: session.user.birthday ?? null,
    }));

  const adminTodayMood = adminPerson
    ? await getTodayMoodForPerson(organization.id, adminPerson.id)
    : null;

  const { upcoming } = splitEvents(events);
  const featuredEvent = upcoming[0] ?? null;
  const otherUpcomingEvents = upcoming.slice(1, 7);

  const departmentOptions = departments.map((d) => ({
    id: d.id,
    name: d.name,
  }));

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-10">
      {/* Cabeçalho da Home */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Visão geral
          </p>
          <h1 className="font-heading text-4xl leading-none tracking-tight">
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
        <div className="flex items-center gap-2">
          <InviteDialog />
        </div>
      </header>

      {/* 1. Atalhos Rápidos com Scroll Horizontal no Mobile */}
      <QuickActions
        isAdmin
        departments={departmentOptions}
        people={peopleOptions}
        isWhatsAppConfigured={isWhatsAppConfigured}
        defaultDate={defaultDate}
      />

      {/* 2. Próximo Culto em Destaque */}
      <FeaturedServiceCard event={featuredEvent} isAdmin />

      {/* 3. Próximos Cultos e Eventos (Carrossel Horizontal) */}
      {otherUpcomingEvents.length > 0 && (
        <UpcomingServicesCarousel events={otherUpcomingEvents} />
      )}

      {/* 4. Felicitômetro Pessoal do Líder */}
      <FelicitometroCard initialMood={adminTodayMood} userName={firstName} />

      {/* 5. Resumo do Cuidado Pastoral & Felicitômetro da Igreja */}
      <PastoralCarePreview overview={moodOverview} />

      {/* 6. Indicadores Gerais da Igreja */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={UsersIcon}
          label="Pessoas"
          value={people.length}
          hint="fazem parte da igreja"
        />
        <StatCard
          icon={LayersIcon}
          label="Ministérios"
          value={departments.length}
          hint="departamentos ativos"
        />
        <StatCard
          icon={MailIcon}
          label="Convites pendentes"
          value={pendingInvitations.length}
          hint="aguardando resposta"
        />
      </div>

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

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

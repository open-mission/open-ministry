import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { getOrganizationPermissionSettingsAction } from "@/app/actions/permissions";
import {
  getEvolutionSettingsAction,
  getUserPasskeysAction,
  getUserSessionsAction,
} from "@/app/actions/settings";
import {
  SettingsView,
  type SettingsScope,
} from "@/components/settings/settings-view";
import { Skeleton } from "@/components/ui/skeleton";
import { loadCalendarFeedViews } from "@/lib/calendar-feed-data";
import { listDepartments } from "@/lib/departments";
import { getOrganizationMessageTemplates } from "@/lib/message-templates-server";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";
import { getUserRecord } from "@/lib/user-record";

export const metadata: Metadata = {
  title: "Configurações",
};

type SettingsSearchParams = Promise<{
  scope?: string;
  tab?: string;
}>;

export default function SettingsPage({
  searchParams,
}: {
  searchParams: SettingsSearchParams;
}) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SettingsContent({
  searchParams,
}: {
  searchParams: SettingsSearchParams;
}) {
  await connection();

  const resolvedParams = await searchParams;
  const { organization, session, role, isAdmin } =
    await requireOrganizationContext();

  const [
    userRecord,
    initialSessions,
    initialPasskeys,
    people,
    departments,
    calendarFeeds,
  ] = await Promise.all([
    getUserRecord(session.user.id),
    getUserSessionsAction(),
    getUserPasskeysAction(),
    listPeople(organization.id),
    listDepartments(organization.id),
    loadCalendarFeedViews(),
  ]);

  const [evolutionSettings, messageTemplates, permissionSettingsResult] = isAdmin
    ? await Promise.all([
        getEvolutionSettingsAction(),
        getOrganizationMessageTemplates(organization.id),
        getOrganizationPermissionSettingsAction(),
      ])
    : [null, [], null];

  const permissionSettings =
    permissionSettingsResult && permissionSettingsResult.ok
      ? permissionSettingsResult.data
      : null;

  const userData = {
    name: userRecord?.name ?? session.user.name,
    username: userRecord?.username ?? null,
    email: userRecord?.email ?? session.user.email,
    birthday: userRecord?.birthday ?? session.user.birthday ?? null,
    phone: userRecord?.phone ?? null,
    image: userRecord?.image ?? session.user.image ?? null,
  };

  const calendarPreferences = {
    weekStartsOn: (userRecord?.weekStartsOn === 1 ? 1 : 0) as 0 | 1,
    timezone: userRecord?.timezone || "America/Sao_Paulo",
  };

  const initialScope: SettingsScope | undefined =
    resolvedParams.scope === "church" || resolvedParams.scope === "account"
      ? resolvedParams.scope
      : undefined;

  return (
    <SettingsView
      organization={organization}
      role={role}
      isAdmin={isAdmin}
      userData={userData}
      calendarPreferences={calendarPreferences}
      calendarFeeds={calendarFeeds}
      initialSessions={initialSessions}
      initialPasskeys={initialPasskeys}
      peopleCount={people.length}
      departmentsCount={departments.length}
      evolutionSettings={evolutionSettings}
      messageTemplates={messageTemplates}
      permissionSettings={permissionSettings}
      initialScope={initialScope}
      initialTab={resolvedParams.tab}
    />
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-hidden>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-64 rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full max-w-xl rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

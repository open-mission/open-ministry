import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  getEvolutionSettingsAction,
  getUserPasskeysAction,
  getUserSessionsAction,
} from "@/app/actions/settings";
import { getOrganizationPermissionSettingsAction } from "@/app/actions/permissions";
import { SettingsView } from "@/components/settings/settings-view";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments } from "@/lib/departments";
import { getOrganizationMessageTemplates } from "@/lib/message-templates-server";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";
import { getUserRecord } from "@/lib/user-record";

export const metadata: Metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  await connection();

  const { organization, session, role, isAdmin } =
    await requireOrganizationContext();

  const [userRecord, initialSessions, initialPasskeys, people, departments] =
    await Promise.all([
      getUserRecord(session.user.id),
      getUserSessionsAction(),
      getUserPasskeysAction(),
      listPeople(organization.id),
      listDepartments(organization.id),
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

  return (
    <SettingsView
      organization={organization}
      role={role}
      isAdmin={isAdmin}
      userData={userData}
      calendarPreferences={calendarPreferences}
      initialSessions={initialSessions}
      initialPasskeys={initialPasskeys}
      peopleCount={people.length}
      departmentsCount={departments.length}
      evolutionSettings={evolutionSettings}
      messageTemplates={messageTemplates}
      permissionSettings={permissionSettings}
    />
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-96 rounded-lg" />
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}

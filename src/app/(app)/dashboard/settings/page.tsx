import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";

import {
  getEvolutionSettingsAction,
  getUserPasskeysAction,
  getUserSessionsAction,
} from "@/app/actions/settings";
import { SettingsView } from "@/components/settings/settings-view";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { listDepartments } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";
import { listPeople } from "@/lib/people";

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

  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
  });

  const [initialSessions, initialPasskeys] = await Promise.all([
    getUserSessionsAction(),
    getUserPasskeysAction(),
  ]);

  const [people, departments, evolutionSettings] = isAdmin
    ? await Promise.all([
        listPeople(organization.id),
        listDepartments(organization.id),
        getEvolutionSettingsAction(),
      ])
    : [[], [], null];

  const userData = {
    name: userRecord?.name ?? session.user.name,
    username: userRecord?.username ?? null,
    email: userRecord?.email ?? session.user.email,
    birthday: userRecord?.birthday ?? session.user.birthday ?? null,
    phone: userRecord?.phone ?? null,
    image: userRecord?.image ?? session.user.image ?? null,
  };

  return (
    <SettingsView
      organization={organization}
      role={role}
      isAdmin={isAdmin}
      userData={userData}
      initialSessions={initialSessions}
      initialPasskeys={initialPasskeys}
      peopleCount={people.length}
      departmentsCount={departments.length}
      evolutionSettings={evolutionSettings}
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

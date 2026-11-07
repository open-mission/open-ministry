import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import {
  BellIcon,
  ChurchIcon,
  CrownIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";

import {
  getEvolutionSettingsAction,
  getUserPasskeysAction,
  getUserSessionsAction,
} from "@/app/actions/settings";
import { AccountProfileCard } from "@/components/settings/account-profile-card";
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card";
import { AdminChurchSettingsCard } from "@/components/settings/admin-church-settings-card";
import { AdminEvolutionApiCard } from "@/components/settings/admin-evolution-api-card";
import { ChangePasswordCard } from "@/components/settings/change-password-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { PasskeysCard } from "@/components/settings/passkeys-card";
import { ThemePreferenceCard } from "@/components/settings/theme-preference-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { listDepartments } from "@/lib/departments";
import { roleLabel } from "@/lib/format";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Configurações
          </h1>
          <Badge variant="outline" className="text-xs font-normal">
            {roleLabel(role)}
          </Badge>
          {isAdmin ? (
            <Badge className="bg-primary text-primary-foreground gap-1 text-xs font-normal">
              <CrownIcon className="size-3" />
              Administração
            </Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Gerencie os dados da sua conta, chaves de acesso biométricas (passkeys),
          sessões ativas, preferências e recursos da sua igreja.
        </p>
      </header>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto p-1 h-auto flex-wrap sm:w-fit">
          <TabsTrigger value="account" className="gap-2 py-2 px-3">
            <UserIcon className="size-4" />
            Minha Conta
          </TabsTrigger>

          <TabsTrigger value="security" className="gap-2 py-2 px-3">
            <ShieldCheckIcon className="size-4" />
            Segurança & Passkeys
          </TabsTrigger>

          <TabsTrigger value="notifications" className="gap-2 py-2 px-3">
            <BellIcon className="size-4" />
            Notificações
          </TabsTrigger>

          {isAdmin ? (
            <TabsTrigger value="church" className="gap-2 py-2 px-3">
              <ChurchIcon className="size-4" />
              Igreja & Governança
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <AccountProfileCard initialData={userData} />
          <ThemePreferenceCard />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <PasskeysCard initialPasskeys={initialPasskeys} />
          <ChangePasswordCard />
          <ActiveSessionsCard initialSessions={initialSessions} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationPreferencesCard />
          {isAdmin && evolutionSettings ? (
            <AdminEvolutionApiCard initialSettings={evolutionSettings} />
          ) : null}
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="church" className="space-y-6">
            <AdminChurchSettingsCard
              organization={organization}
              peopleCount={people.length}
              departmentsCount={departments.length}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
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

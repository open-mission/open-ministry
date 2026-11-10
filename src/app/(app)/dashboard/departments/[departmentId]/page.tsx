import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeftIcon, CrownIcon, MegaphoneIcon } from "lucide-react";

import { DeleteDepartmentButton } from "@/components/departments/delete-department-button";
import { DepartmentModulesSection } from "@/components/departments/department-modules-section";
import { DepartmentPermissionsSection } from "@/components/departments/department-permissions-section";
import { EditDepartmentDialog } from "@/components/departments/edit-department-dialog";
import { FunctionsSection } from "@/components/departments/functions-section";
import { PeopleSection } from "@/components/departments/people-section";
import { AnnouncementDialog } from "@/components/notifications/announcement-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartmentGrantsAction } from "@/app/actions/department-permissions";
import { getDepartmentAccess } from "@/lib/departments";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";
import { requireOrganizationContext } from "@/lib/organizations";
import { MODULE_KEYS, type ModuleKey } from "@/lib/permissions/catalog";
import { isOrganizationModuleEnabled } from "@/lib/permissions/service";
import {
  listPeople,
  personDisplayEmail,
  personDisplayName,
} from "@/lib/people";

export const metadata: Metadata = {
  title: "Departamento",
};

export default function DepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  return (
    <Suspense fallback={<DepartmentSkeleton />}>
      <DepartmentContent params={params} />
    </Suspense>
  );
}

async function DepartmentContent({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  await connection();

  const { departmentId } = await params;
  const context = await requireOrganizationContext();
  const [access, people, evolutionResult, grantsResult, ...moduleAvailabilities] =
    await Promise.all([
      getDepartmentAccess(
        context.organization.id,
        departmentId,
        context.session.user.id,
        context.isAdmin,
      ),
      listPeople(context.organization.id),
      getOrganizationEvolutionConfig(context.organization.id),
      listDepartmentGrantsAction(departmentId),
      ...MODULE_KEYS.map((key) =>
        isOrganizationModuleEnabled(context.organization.id, key),
      ),
    ]);

  if (!access) {
    notFound();
  }

  const churchModuleAvailability: Record<string, boolean> = {};
  MODULE_KEYS.forEach((key, index) => {
    churchModuleAvailability[key] = moduleAvailabilities[index];
  });

  const { department } = access;
  const leaders = department.members.filter((member) => member.isLeader);
  const assignedIds = new Set(
    department.members.map((member) => member.personId),
  );
  const availableMembers = people
    .filter((person) => !assignedIds.has(person.id))
    .map((person) => ({
      id: person.id,
      name: personDisplayName(person),
      email: personDisplayEmail(person),
      hasAccount: Boolean(person.userId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <Link
          href="/dashboard/departments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Departamentos
        </Link>
      </div>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-4xl leading-none tracking-tight">
              {department.name}
            </h1>
            {access.isLeader && !context.isAdmin ? (
              <Badge variant="secondary" className="font-normal">
                Você lidera este departamento
              </Badge>
            ) : null}
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {department.description ?? "Sem descrição por enquanto."}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>
              {department.members.length === 1
                ? "1 pessoa"
                : `${department.members.length} pessoas`}
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>
              {department.functions.length === 1
                ? "1 função"
                : `${department.functions.length} funções`}
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            {leaders.length === 0 ? (
              <span>Sem líder definido</span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-2">
                {leaders.map((leader) => (
                  <span
                    key={leader.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-2.5 py-0.5 font-medium text-accent-foreground"
                  >
                    <CrownIcon className="size-3" />
                    {personDisplayName(leader.person)}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {access.canManage ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <AnnouncementDialog
              departments={[{ id: department.id, name: department.name }]}
              people={department.members
                .filter((m) => m.person?.userId !== context.session.user.id)
                .map((m) => ({
                  id: m.person.id,
                  name: personDisplayName(m.person),
                  phone: m.person.phone,
                  hasAccount: Boolean(m.person.userId),
                  departmentNames: [department.name],
                }))}
              defaultDepartmentId={department.id}
              isWhatsAppConfigured={Boolean(evolutionResult.config)}
              trigger={
                <Button variant="outline" size="sm" className="h-9">
                  <MegaphoneIcon data-icon="inline-start" />
                  Enviar aviso
                </Button>
              }
            />
            <EditDepartmentDialog department={department} />
            {access.canManageLeaders ? (
              <DeleteDepartmentButton
                departmentId={department.id}
                departmentName={department.name}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <DepartmentModulesSection
        departmentId={department.id}
        activeModuleKeys={(department.modules ?? []).map((m) => m.moduleKey)}
        churchModuleAvailability={churchModuleAvailability}
        canManage={access.canManage}
      />

      <DepartmentPermissionsSection
        departmentId={department.id}
        departmentName={department.name}
        members={department.members}
        initialGrants={grantsResult.ok ? grantsResult.data : []}
        canManage={access.canManage}
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <PeopleSection
          department={department}
          availableMembers={availableMembers}
          canManage={access.canManage}
          canManageLeaders={access.canManageLeaders}
          canViewExperience={access.canViewExperience}
        />
        <FunctionsSection
          department={department}
          canManage={access.canManage}
        />
      </div>
    </div>
  );
}

function DepartmentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

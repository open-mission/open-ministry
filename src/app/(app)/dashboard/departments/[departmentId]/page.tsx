import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeftIcon, CrownIcon } from "lucide-react";

import { DeleteDepartmentButton } from "@/components/departments/delete-department-button";
import { EditDepartmentDialog } from "@/components/departments/edit-department-dialog";
import { FunctionsSection } from "@/components/departments/functions-section";
import { PeopleSection } from "@/components/departments/people-section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getDepartmentAccess } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";

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
  const access = await getDepartmentAccess(
    context.organization.id,
    departmentId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!access) {
    notFound();
  }

  const { department } = access;
  const leaders = department.members.filter((member) => member.isLeader);
  const assignedIds = new Set(department.members.map((member) => member.userId));
  const availableMembers = context.organization.members
    .filter((member) => !assignedIds.has(member.userId))
    .map((member) => ({
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
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
                    {leader.user.name}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {access.canManage ? (
          <div className="flex shrink-0 items-center gap-1.5">
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

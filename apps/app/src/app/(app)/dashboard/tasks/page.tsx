import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShieldAlertIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { TasksView } from "@/features/tasks/components/tasks-view";
import { listTasks } from "@/features/tasks/services/tasks-service";
import { listDepartments } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Tarefas",
  description: "Gerencie tarefas pessoais, afazeres da equipe e demandas ministeriais.",
};

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksSkeleton />}>
      <TasksContent />
    </Suspense>
  );
}

async function TasksContent() {
  await connection();

  const { organization, session } = await requireOrganizationContext();
  const userId = session.user.id;

  const [hasAccess, canDelegateDepartment, canDelegateChurch] =
    await Promise.all([
      can("tasks", "read"),
      can("tasks", "createDepartment"),
      can("tasks", "createOrganization"),
    ]);

  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlertIcon className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Tarefas desativado
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Tarefas está desativado para esta igreja. Entre em contato com a administração caso precise ativá-lo.
          </p>
        </div>
      </div>
    );
  }

  // Obter departamentos da organização e mapear liderança e participação
  const departmentsData = await listDepartments(organization.id);
  const ledDepartmentIds = departmentsData
    .filter((d) => d.members.some((m) => m.isLeader && m.person?.userId === userId))
    .map((d) => d.id);
  const memberDepartmentIds = departmentsData
    .filter((d) => d.members.some((m) => m.person?.userId === userId))
    .map((d) => d.id);

  // Buscar membros com usuário para atribuição rápida
  const [tasks, membersRows] = await Promise.all([
    listTasks({
      organizationId: organization.id,
      userId,
      isAdmin: canDelegateChurch,
      ledDepartmentIds,
      memberDepartmentIds,
    }),
    db.query.person.findMany({
      where: (person, { eq, isNotNull, and }) =>
        and(
          eq(person.organizationId, organization.id),
          isNotNull(person.userId),
        ),
      columns: {
        id: true,
        userId: true,
        name: true,
        email: true,
      },
      limit: 100,
    }),
  ]);

  const members = membersRows
    .filter((m): m is typeof m & { userId: string } => Boolean(m.userId))
    .map((m) => ({
      userId: m.userId,
      personId: m.id,
      name: m.name,
      email: m.email,
    }));

  const departments = departmentsData.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 min-w-0">
      <TasksView
        initialTasks={tasks}
        departments={departments}
        members={members}
        currentUserId={userId}
        isAdmin={canDelegateChurch}
        canDelegateDepartment={canDelegateDepartment}
        canDelegateChurch={canDelegateChurch}
      />
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 min-w-0">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}

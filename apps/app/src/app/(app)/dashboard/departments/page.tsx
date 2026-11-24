import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HandHeartIcon } from "lucide-react";

import {
  getMyAvailabilityAction,
  getMyUnavailabilitiesAction,
} from "@/app/actions/availability";
import { DepartmentsWorkspace } from "@/components/availability/availability-reminder-widget";
import { CreateDepartmentDialog } from "@/components/departments/create-department-dialog";
import { DepartmentCard } from "@/components/departments/department-card";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Departamentos",
};

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<DepartmentsSkeleton />}>
      <DepartmentsContent />
    </Suspense>
  );
}

async function DepartmentsContent() {
  await connection();

  const { organization, session, isAdmin } = await requireOrganizationContext();
  const [departments, canManageAvailability] = await Promise.all([
    listDepartments(organization.id),
    can("schedules", "manageOwnAvailability"),
  ]);

  const panelData = canManageAvailability
    ? await Promise.all([
        getMyAvailabilityAction(),
        getMyUnavailabilitiesAction(),
      ])
        .then(([availability, unavailabilities]) =>
          availability ? { availability, unavailabilities } : null,
        )
        .catch(() => null)
    : null;

  const participatedDepartments = departments.filter((department) =>
    department.members.some(
      (member) => member.person?.userId === session.user.id,
    ),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <DepartmentsWorkspace
        isAdmin={isAdmin}
        canManageAvailability={canManageAvailability}
        initialPanelData={panelData}
      >
        {participatedDepartments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HandHeartIcon className="size-6" />
            </span>
            <div className="max-w-sm space-y-1.5">
              <p className="font-heading text-xl tracking-tight">
                Você ainda não participa de nenhum departamento
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isAdmin
                  ? "Crie um novo ministério ou adicione seu perfil a um existente para acompanhá-lo aqui."
                  : "Quando a liderança adicionar você a um ministério, ele aparecerá aqui."}
              </p>
            </div>
            {isAdmin ? <CreateDepartmentDialog /> : null}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {participatedDepartments.map((department) => (
              <DepartmentCard key={department.id} department={department} />
            ))}
          </div>
        )}
      </DepartmentsWorkspace>
    </div>
  );
}

function DepartmentsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

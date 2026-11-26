import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShieldAlertIcon } from "lucide-react";

import { getCalendarDataAction } from "@/app/actions/calendar";
import { DomainSubtabs } from "@/components/app/domain-subtabs-server";
import { NativeCalendar } from "@/components/calendar/native-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartmentOptions } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";
import { can, canAnyDepartment } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Agenda",
  description:
    "Acompanhe cultos, escalas e períodos de indisponibilidade em formato de calendário.",
};

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarContent />
    </Suspense>
  );
}

async function CalendarContent() {
  await connection();
  const { organization, isAdmin } = await requireOrganizationContext();
  const hasAccess = await can("agenda", "read");

  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlertIcon className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de agenda não disponível
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            O módulo de agenda não está liberado para a sua igreja ou
            departamento.
          </p>
        </div>
      </div>
    );
  }

  const [data, departments] = await Promise.all([
    getCalendarDataAction(),
    listDepartmentOptions(organization.id),
  ]);
  const departmentIds = departments.map((department) => department.id);

  // The create action is delegable per department, so an admin check is not
  // enough: a department leader with the grant must see the button too.
  const canCreateEvent =
    isAdmin || (await canAnyDepartment("agenda", "createEvent", departmentIds));
  const canCreateRehearsal =
    isAdmin ||
    (await canAnyDepartment("rehearsals", "createRehearsal", departmentIds));
  // Checado também no servidor na server action de escalas; aqui apenas
  // controla a visibilidade do botão "Ver escalas".
  const canViewSchedules = await can("schedules", "read");

  return (
    <div
      data-calendar-container=""
      className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col md:gap-4"
    >
      <div className="hidden empty:hidden md:block">
        <DomainSubtabs domain="cultos" />
      </div>

      <NativeCalendar
        initialItems={data.items}
        initialPreferences={data.preferences}
        organizationName={organization.name}
        canCreateEvent={canCreateEvent}
        canCreateRehearsal={canCreateRehearsal}
        canViewTeamAvailability={data.canViewTeamAvailability}
        canViewSchedules={canViewSchedules}
        departments={departments}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col gap-3 md:gap-4" aria-hidden>
      <div className="flex items-center justify-between gap-3 md:hidden">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div className="flex items-center gap-2 pr-21">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="size-11 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-13 w-full rounded-xl md:hidden" />
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-xl md:h-150" />
    </div>
  );
}

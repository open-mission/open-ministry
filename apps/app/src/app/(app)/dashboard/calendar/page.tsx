import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { DomainSubtabs } from "@/components/app/domain-subtabs-server";
import { ShieldAlertIcon } from "lucide-react";

import { getCalendarDataAction } from "@/app/actions/calendar";
import { FullCalendar } from "@/components/calendar/full-calendar";
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

  const departmentOptions = departments;

  // The create action is delegable per department, so an admin check is not
  // enough: a department leader with the grant must see the button too.
  const departmentIds = departments.map((department) => department.id);

  const canCreateEvent =
    isAdmin || (await canAnyDepartment("agenda", "createEvent", departmentIds));

  const canCreateRehearsal =
    isAdmin ||
    (await canAnyDepartment("rehearsals", "createRehearsal", departmentIds));

  return (
    <div
      data-calendar-fullframe=""
      className="flex w-full min-w-0 flex-1 flex-col gap-3"
    >
      <div className="px-4 pr-14 pt-1 sm:px-5 sm:pr-16 md:pl-14">
        <DomainSubtabs domain="cultos" />
      </div>
      <FullCalendar
        initialItems={data.items}
        initialPreferences={data.preferences}
        canCreateEvent={canCreateEvent}
        canCreateRehearsal={canCreateRehearsal}
        canViewTeamAvailability={data.canViewTeamAvailability}
        departments={departmentOptions}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div
      data-calendar-fullframe=""
      className="flex w-full flex-1 flex-col gap-4"
      aria-hidden
    >
      <div className="flex flex-col gap-4 px-4 pt-1 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-[600px] flex-1 rounded-none" />
    </div>
  );
}

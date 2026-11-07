import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCalendarDataAction } from "@/app/actions/calendar";
import { FullCalendar } from "@/components/calendar/full-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Agenda e Calendário",
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
  await requireOrganizationContext();

  const data = await getCalendarDataAction();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <FullCalendar
        initialItems={data.items}
        initialPreferences={data.preferences}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-[600px] rounded-xl" />
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  getMyAvailabilityAction,
  getMyUnavailabilitiesAction,
} from "@/app/actions/availability";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { UnavailabilitySection } from "@/components/availability/unavailability-section";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Disponibilidade para Servir",
};

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<AvailabilitySkeleton />}>
      <AvailabilityContent />
    </Suspense>
  );
}

async function AvailabilityContent() {
  await connection();
  await requireOrganizationContext();

  const hasAccess = await can("schedules", "manageOwnAvailability");
  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Disponibilidade não disponível
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Escalas e Disponibilidade não está liberado para sua igreja.
          </p>
        </div>
      </div>
    );
  }

  const [data, unavailabilities] = await Promise.all([
    getMyAvailabilityAction(),
    getMyUnavailabilitiesAction(),
  ]);

  if (!data) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <AvailabilityEditor initialData={data} />
      <UnavailabilitySection initialItems={unavailabilities} />
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-[460px] rounded-xl" />
    </div>
  );
}

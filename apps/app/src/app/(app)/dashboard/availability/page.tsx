import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShieldAlertIcon } from "lucide-react";

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
  title: "Disponibilidade",
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
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlertIcon className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de disponibilidade não disponível
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            O módulo de Escalas e disponibilidade não está liberado para você
            nesta igreja. Fale com a liderança se precisar informar quando pode
            servir.
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
      <header className="space-y-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Disponibilidade
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Informe quando você pode servir. A liderança usa esses horários para
          montar as escalas dos encontros.
        </p>
      </header>

      <AvailabilityEditor initialData={data} />
      <UnavailabilitySection initialItems={unavailabilities} />
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-[560px] rounded-xl" />
      <Skeleton className="h-[320px] rounded-xl" />
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { getMyAvailabilityAction } from "@/app/actions/availability";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";

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

  const data = await getMyAvailabilityAction();
  if (!data) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <AvailabilityEditor initialData={data} />
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

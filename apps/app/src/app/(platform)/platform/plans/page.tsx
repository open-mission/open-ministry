import { connection } from "next/server";
import { Suspense } from "react";

import { listPlatformPlansAction } from "@/app/actions/platform";
import { runPlatformPageQuery } from "@/components/platform/platform-page-guard";
import { PlatformPlansView } from "@/components/platform/platform-plans-view";
import { Skeleton } from "@/components/ui/skeleton";

async function PlatformPlansContent() {
  await connection();

  const plans = await runPlatformPageQuery(() => listPlatformPlansAction());
  return <PlatformPlansView initialPlans={plans} />;
}

export default function PlatformPlansPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-14 w-72 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      }
    >
      <PlatformPlansContent />
    </Suspense>
  );
}

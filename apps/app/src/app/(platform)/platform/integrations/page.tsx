import { connection } from "next/server";
import { Suspense } from "react";

import { listPlatformIntegrationsAction } from "@/app/actions/platform";
import { PlatformIntegrationsView } from "@/components/platform/platform-integrations-view";
import { runPlatformPageQuery } from "@/components/platform/platform-page-guard";
import { Skeleton } from "@/components/ui/skeleton";

async function PlatformIntegrationsContent() {
  await connection();

  const integrations = await runPlatformPageQuery(() =>
    listPlatformIntegrationsAction(),
  );
  return <PlatformIntegrationsView initialIntegrations={integrations} />;
}

export default function PlatformIntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-14 w-72 rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      }
    >
      <PlatformIntegrationsContent />
    </Suspense>
  );
}

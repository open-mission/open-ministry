import { connection } from "next/server";
import { Suspense } from "react";

import {
  getPlatformOverviewAction,
  listPlatformOrganizationsAction,
  listPlatformPlansAction,
} from "@/app/actions/platform";
import { PlatformOrganizationsView } from "@/components/platform/platform-organizations-view";
import { runPlatformPageQuery } from "@/components/platform/platform-page-guard";
import { Skeleton } from "@/components/ui/skeleton";

async function PlatformOverviewContent() {
  await connection();

  const [overview, orgList, plans] = await runPlatformPageQuery(() =>
    Promise.all([
      getPlatformOverviewAction(),
      listPlatformOrganizationsAction({ limit: 50 }),
      listPlatformPlansAction().catch(() => []),
    ]),
  );

  return (
    <PlatformOrganizationsView
      initialOverview={overview}
      initialOrganizations={orgList.organizations}
      initialTotal={orgList.total}
      plans={plans}
    />
  );
}

export default function PlatformOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-14 w-72 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      }
    >
      <PlatformOverviewContent />
    </Suspense>
  );
}

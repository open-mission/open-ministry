import { connection } from "next/server";
import { Suspense } from "react";

import {
  listPlatformAuditLogAction,
  listPlatformOperatorsAction,
} from "@/app/actions/platform";
import { PlatformOperatorsView } from "@/components/platform/platform-operators-view";
import { runPlatformPageQuery } from "@/components/platform/platform-page-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { getSuperAdminSession } from "@/lib/platform/auth";

async function PlatformOperatorsContent() {
  await connection();

  const [operators, audit, session] = await runPlatformPageQuery(() =>
    Promise.all([
      listPlatformOperatorsAction(),
      listPlatformAuditLogAction({ limit: 50 }),
      getSuperAdminSession(),
    ]),
  );

  return (
    <PlatformOperatorsView
      initialOperators={operators}
      initialAuditEntries={audit.entries}
      initialAuditTotal={audit.total}
      currentOperatorEmail={session?.user.email ?? null}
    />
  );
}

export default function PlatformOperatorsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-14 w-72 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <PlatformOperatorsContent />
    </Suspense>
  );
}

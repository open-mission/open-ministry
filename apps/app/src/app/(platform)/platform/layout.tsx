import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getPlatformOverviewAction } from "@/app/actions/platform";
import { resolvePlatformGuardRedirect } from "@/components/platform/platform-guard";
import {
  PlatformShell,
  type PlatformEvolutionHealthSummary,
} from "@/components/platform/platform-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Painel da Plataforma | OpenMinistry",
};

async function PlatformLayoutGate({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  let operator: { name?: string | null; email?: string | null } = {};
  try {
    const session = await requireSuperAdmin("access");
    operator = {
      email: session.user.email,
      name: (session.user as { name?: string | null }).name ?? null,
    };
  } catch (error) {
    const existingSession = await getSession().catch(() => null);
    const target = resolvePlatformGuardRedirect(Boolean(existingSession), error);
    redirect(target ?? "/");
  }

  let evolutionHealth: PlatformEvolutionHealthSummary = null;
  try {
    const overview = await getPlatformOverviewAction();
    const evo = overview.providers.find(
      (provider) => provider.provider === "evolution_whatsapp",
    );
    if (evo) {
      evolutionHealth = {
        isEnabled: evo.isEnabled,
        source: evo.source,
        lastHealthStatus: evo.lastHealthStatus,
        lastHealthLatencyMs: evo.lastHealthLatencyMs,
      };
    }
  } catch {
    evolutionHealth = null;
  }

  return (
    <PlatformShell operator={operator} evolutionHealth={evolutionHealth}>
      {children}
    </PlatformShell>
  );
}

function PlatformShellSkeleton() {
  return (
    <div className="min-h-dvh bg-background p-6 space-y-6" aria-hidden>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PlatformShellSkeleton />}>
      <PlatformLayoutGate>{children}</PlatformLayoutGate>
    </Suspense>
  );
}

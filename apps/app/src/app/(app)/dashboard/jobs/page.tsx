import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageInfo } from "@/components/app/page-info";
import { JobsConsole } from "@/components/jobs/jobs-console";
import { Skeleton } from "@/components/ui/skeleton";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { listBackgroundJobs } from "@/lib/jobs/service";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Tarefas agendadas",
};

export default function JobsPage() {
  return (
    <Suspense fallback={<JobsSkeleton />}>
      <JobsContent />
    </Suspense>
  );
}

async function JobsContent() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const isLeader = !isAdmin
    ? await isUserLeaderInAnyDepartment(organization.id, session.user.id)
    : false;

  if (!isAdmin && !isLeader) {
    redirect("/");
  }

  const initialJobs = await listBackgroundJobs(organization.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tarefas em segundo plano
          </h1>
          <PageInfo
            title="Tarefas agendadas"
            description="Acompanhe o processamento de exportações pesadas (PDFs de cronogramas), relatórios e rotinas em segundo plano com atualização em tempo real."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Histórico e monitoramento de tarefas assíncronas de {organization.name}.
        </p>
      </header>

      <JobsConsole initialJobs={initialJobs} />
    </div>
  );
}

function JobsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

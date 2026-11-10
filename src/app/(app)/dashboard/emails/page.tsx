import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { listEmailLogsAction } from "@/app/actions/emails";
import { PageInfo } from "@/components/app/page-info";
import { EmailsConsole } from "@/components/emails/emails-console";
import { Skeleton } from "@/components/ui/skeleton";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Emails Transacionais & Modelos",
};

export default function EmailsPage() {
  return (
    <Suspense fallback={<EmailsSkeleton />}>
      <EmailsContent />
    </Suspense>
  );
}

async function EmailsContent() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const isLeader = !isAdmin
    ? await isUserLeaderInAnyDepartment(organization.id, session.user.id)
    : false;

  if (!isAdmin && !isLeader) {
    redirect("/dashboard");
  }

  const logsResult = await listEmailLogsAction();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Emails
          </h1>
          <PageInfo
            title="Emails Transacionais & Modelos"
            description="Histórico de emails transacionais enviados via Brevo (escalas, avisos, autenticação) e catálogo de modelos desenvolvidos em React Email."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Acompanhe os disparos em tempo real da <strong>{organization.name}</strong> e
          visualize a prévia dos modelos de email disponíveis.
        </p>
      </header>

      <EmailsConsole
        initialLogs={logsResult.logs}
        initialStats={logsResult.stats}
        churchName={organization.name}
        userEmail={session.user.email}
      />
    </div>
  );
}

function EmailsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>

      <Skeleton className="h-10 w-80 rounded-lg" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

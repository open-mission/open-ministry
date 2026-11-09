import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageInfo } from "@/components/app/page-info";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppMessageLogsCard } from "@/components/whatsapp/whatsapp-message-logs";
import { isUserLeaderInAnyDepartment } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "WhatsApp",
};

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<WhatsAppSkeleton />}>
      <WhatsAppContent />
    </Suspense>
  );
}

async function WhatsAppContent() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const isLeader = !isAdmin
    ? await isUserLeaderInAnyDepartment(organization.id, session.user.id)
    : false;

  if (!isAdmin && !isLeader) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            WhatsApp
          </h1>
          <PageInfo
            title="Mensagens do WhatsApp"
            description="Histórico de mensagens automáticas disparadas pelo sistema (escalas, avisos e notificações) com confirmações de entrega e leitura."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Acompanhe os envios, status de entrega e reenvie eventuais mensagens com falha para membros de {organization.name}.
        </p>
      </header>

      <WhatsAppMessageLogsCard />
    </div>
  );
}

function WhatsAppSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

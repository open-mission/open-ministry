import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BellIcon, MegaphoneIcon, ShieldAlertIcon } from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { AnnouncementsConsole } from "@/components/announcements/announcements-console";
import { SentAnnouncementsList } from "@/components/announcements/sent-announcements-list";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationRow } from "@/components/notifications/notification-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments, listUserLeaderDepartments } from "@/lib/departments";
import { formatDateTime } from "@/lib/format";
import {
  countUnreadNotifications,
  listNotifications,
  listSentAnnouncementsWithReadReceipts,
} from "@/lib/notifications";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";
import { listPeople, personDisplayName } from "@/lib/people";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export const metadata: Metadata = {
  title: "Avisos & Comunicados",
};

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<AnnouncementsSkeleton />}>
      <AnnouncementsContent />
    </Suspense>
  );
}

async function AnnouncementsContent() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();

  const hasAccess = await can("announcements", "read");
  if (!hasAccess) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlertIcon className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Módulo de Avisos não disponível
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Avisos não está liberado para sua igreja ou departamento.
          </p>
        </div>
      </div>
    );
  }

  const [
    notifications,
    unreadCount,
    leaderDepartments,
    allDepartments,
    people,
    evolutionResult,
    canSendAll,
    canRetryDelivery,
  ] = await Promise.all([
    listNotifications(organization.id, session.user.id, 50),
    countUnreadNotifications(organization.id, session.user.id),
    listUserLeaderDepartments(organization.id, session.user.id),
    isAdmin ? listDepartments(organization.id) : Promise.resolve([]),
    listPeople(organization.id),
    getOrganizationEvolutionConfig(organization.id),
    can("announcements", "sendAll"),
    can("announcements", "retryDelivery"),
  ]);

  const canSendAnnouncement = canSendAll || leaderDepartments.length > 0;
  const sentAnnouncements = canSendAnnouncement
    ? await listSentAnnouncementsWithReadReceipts(
        organization.id,
        session.user.id,
        isAdmin,
      )
    : [];
  const availableDepartments = isAdmin ? allDepartments : leaderDepartments;

  const ledDeptIds = new Set(leaderDepartments.map((d) => d.id));
  const availablePeople = people
    .filter((person) => person.userId !== session.user.id)
    .filter((person) => {
      if (isAdmin) return true;
      return person.memberships.some((m) => ledDeptIds.has(m.departmentId));
    })
    .map((person) => ({
      id: person.id,
      name: personDisplayName(person),
      phone: person.phone,
      hasAccount: Boolean(person.userId),
      departmentNames: person.memberships.map((m) => m.department.name),
    }));

  const departmentOptions = availableDepartments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MegaphoneIcon className="size-5" />
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl leading-none tracking-tight">
            Avisos &amp; Comunicados
          </h1>
          <PageInfo
            title="Avisos & Comunicados"
            description="Comunicação centralizada para igrejas e departamentos com disparo no App, WhatsApp e Notificações Push."
          />
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 ? <MarkAllReadButton /> : null}
          <Badge variant="outline" className="font-mono text-xs">
            {unreadCount} não lido{unreadCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </header>

      {/* Console de Envio (Apenas se tiver capacidade de envio) */}
      {canSendAnnouncement ? (
        <section className="space-y-4">
          <AnnouncementsConsole
            isAdmin={canSendAll}
            departments={departmentOptions}
            people={availablePeople}
            isWhatsAppConfigured={Boolean(evolutionResult.config)}
            churchName={organization.name}
            currentUserName={session.user.name}
          />
        </section>
      ) : null}

      {/* Confirmações de Leitura e Histórico de Envios */}
      {canSendAnnouncement && sentAnnouncements.length > 0 ? (
        <SentAnnouncementsList
          announcements={sentAnnouncements}
          canRetry={canRetryDelivery}
        />
      ) : null}

      {/* Feed de Avisos e Notificações Recentes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl tracking-tight">
              Avisos Recentes
            </h2>
            <p className="text-xs text-muted-foreground">
              Histórico de mensagens e convites recebidos na sua comunidade.
            </p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BellIcon className="size-5" />
            </span>
            <p className="font-heading text-base font-medium">
              Nenhum aviso no momento
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Quando você receber um comunicado da liderança ou for escalado em
              um culto, a mensagem aparecerá aqui.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={{
                      id: notification.id,
                      type: notification.type,
                      title: notification.title,
                      body: notification.body,
                      href: notification.href,
                      read: Boolean(notification.readAt),
                      createdAtLabel: formatDateTime(notification.createdAt),
                    }}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-96 rounded-2xl lg:col-span-7" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-5" />
      </div>
    </div>
  );
}

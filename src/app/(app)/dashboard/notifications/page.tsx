import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BellIcon } from "lucide-react";

import { AnnouncementDialog } from "@/components/notifications/announcement-dialog";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationRow } from "@/components/notifications/notification-row";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listDepartments, listUserLeaderDepartments } from "@/lib/departments";
import { formatDateTime } from "@/lib/format";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/lib/notifications";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";
import { listPeople, personDisplayName } from "@/lib/people";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Notificações",
};

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}

async function NotificationsContent() {
  await connection();

  const { organization, session, isAdmin } =
    await requireOrganizationContext();
  const [
    notifications,
    unreadCount,
    leaderDepartments,
    allDepartments,
    people,
    evolutionResult,
  ] = await Promise.all([
    listNotifications(organization.id, session.user.id, 50),
    countUnreadNotifications(organization.id, session.user.id),
    listUserLeaderDepartments(organization.id, session.user.id),
    isAdmin ? listDepartments(organization.id) : Promise.resolve([]),
    listPeople(organization.id),
    getOrganizationEvolutionConfig(organization.id),
  ]);

  const canSendAnnouncement = isAdmin || leaderDepartments.length > 0;
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

  const unread = notifications.filter(
    (notification) => !notification.readAt,
  );
  const read = notifications.filter(
    (notification) => notification.readAt,
  );
  const departmentOptions = availableDepartments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-4xl leading-none tracking-tight">
              Notificações
            </h1>
            <Badge variant="outline" className="font-normal">
              {unreadCount}
            </Badge>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Avisos de escalas e mensagens da liderança de{" "}
            <span className="font-medium text-foreground">
              {organization.name}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 ? <MarkAllReadButton /> : null}
          {canSendAnnouncement ? (
            <AnnouncementDialog
              departments={departmentOptions}
              people={availablePeople}
              canBroadcastAll={isAdmin}
              isWhatsAppConfigured={Boolean(evolutionResult.config)}
            />
          ) : null}
        </div>
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellIcon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              Nenhuma notificação ainda
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Quando você for escalado ou receber um aviso da liderança, a
              mensagem aparece aqui.
            </p>
          </div>
        </div>
      ) : (
        <>
          {unread.length > 0 ? (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-tight">
                  Não lidas
                </CardTitle>
                <CardDescription>
                  {unreadCount === 1
                    ? "1 notificação esperando você."
                    : `${unreadCount} notificações esperando você.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {unread.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={{
                        id: notification.id,
                        type: notification.type,
                        title: notification.title,
                        body: notification.body,
                        href: notification.href,
                        read: false,
                        createdAtLabel: formatDateTime(
                          notification.createdAt,
                        ),
                      }}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {read.length > 0 ? (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-tight">
                  Anteriores
                </CardTitle>
                <CardDescription>
                  As notificações que você já leu.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {read.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={{
                        id: notification.id,
                        type: notification.type,
                        title: notification.title,
                        body: notification.body,
                        href: notification.href,
                        read: true,
                        createdAtLabel: formatDateTime(
                          notification.createdAt,
                        ),
                      }}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

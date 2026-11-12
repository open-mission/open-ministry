import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  CalendarDaysIcon,
  CalendarIcon,
  ClockIcon,
  CrownIcon,
  HeartHandshakeIcon,
  MailIcon,
  MessageCircleIcon,
  MessageSquareHeartIcon,
  PhoneIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { RoleBadge } from "@/components/members/role-badge";
import { AnnouncementDialog } from "@/components/notifications/announcement-dialog";
import { EditPersonDialog } from "@/components/people/edit-person-dialog";
import { InvitePersonDialog } from "@/components/people/invite-person-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getPersonAssignments,
  getPersonMemberships,
  splitAssignments,
} from "@/lib/agenda";
import {
  canUserViewPersonMood,
  getPersonMoodHistory,
  MOOD_LEVELS,
} from "@/lib/felicitometro";
import { getInitials, isExpired } from "@/lib/format";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  getPerson,
  personDisplayBirthday,
  personDisplayName,
} from "@/lib/people";

export const metadata: Metadata = {
  title: "Perfil do Membro",
};

export default function MemberPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  return (
    <Suspense fallback={<MemberPageSkeleton />}>
      <MemberPageContent params={params} />
    </Suspense>
  );
}

async function MemberPageContent({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  await connection();

  const { personId } = await params;
  const context = await requireOrganizationContext();
  const { organization, session, isAdmin } = context;

  const person = await getPerson(organization.id, personId);
  if (!person) {
    notFound();
  }

  const canView = await canUserViewPersonMood({
    organizationId: organization.id,
    viewerUserId: session.user.id,
    targetPersonId: personId,
    isAdmin,
  });

  if (!canView) {
    notFound();
  }

  const [
    assignments,
    memberships,
    moodHistory,
    unavailabilities,
    evolutionResult,
  ] = await Promise.all([
    getPersonAssignments(organization.id, personId),
    getPersonMemberships(personId),
    getPersonMoodHistory(organization.id, personId, 60),
    db.query.personUnavailability.findMany({
      where: eq(schema.personUnavailability.personId, personId),
      orderBy: (table, { desc }) => [desc(table.date)],
    }),
    getOrganizationEvolutionConfig(organization.id),
  ]);

  const { upcoming, past } = splitAssignments(assignments);

  const role = organization.members.find(
    (m) => m.userId === person.userId,
  )?.role;

  const pendingInvitation = person.email
    ? organization.invitations.find(
        (inv) =>
          inv.email.toLowerCase() === person.email?.toLowerCase() &&
          inv.status === "pending" &&
          !isExpired(inv.expiresAt),
      )
    : null;

  const phoneClean = person.phone?.replace(/\D/g, "");
  const waPhone = phoneClean
    ? phoneClean.length === 10 || phoneClean.length === 11
      ? `55${phoneClean}`
      : phoneClean
    : null;

  // Felicitômetro stats
  const totalMoods = moodHistory.length;
  const averageMood =
    totalMoods > 0
      ? Number(
          (
            moodHistory.reduce((acc, m) => acc + m.score, 0) / totalMoods
          ).toFixed(1),
        )
      : 0;

  const latestMood = moodHistory[0] ?? null;
  const activePrayerRequest = moodHistory.find((m) => m.needsPrayer);
  const activeTalkRequest = moodHistory.find((m) => m.needsTalk);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-12">
      {/* Header do Membro */}
      <Card className="rounded-2xl border-border/70 shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <Avatar className="size-20 sm:size-24 border-2 border-background shadow-md">
                <AvatarImage
                  src={person.image || undefined}
                  alt={personDisplayName(person)}
                />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {getInitials(personDisplayName(person))}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {personDisplayName(person)}
                  </h1>
                  {role ? (
                    <RoleBadge role={role} />
                  ) : person.userId ? (
                    <Badge variant="outline" className="text-xs">
                      Membro
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs font-normal">
                      Sem conta
                    </Badge>
                  )}
                  {pendingInvitation ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-amber-500/10 text-xs font-normal text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    >
                      <ClockIcon className="size-3" />
                      Convite pendente
                    </Badge>
                  ) : null}
                  {person.user?.pwaInstalled ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-emerald-50 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      title={`Aplicativo PWA instalado no ${person.user.pwaPlatform ? person.user.pwaPlatform.toUpperCase() : "dispositivo"}`}
                    >
                      <SmartphoneIcon className="size-3" />
                      App PWA
                    </Badge>
                  ) : null}
                  {latestMood && (
                    <span
                      className="text-2xl"
                      title={`Sentimento recente: ${MOOD_LEVELS[latestMood.score]?.label}`}
                      aria-label={`Sentimento recente: ${MOOD_LEVELS[latestMood.score]?.label}`}
                      role="img"
                    >
                      {MOOD_LEVELS[latestMood.score]?.emoji}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {person.email && (
                    <span className="flex items-center gap-1.5">
                      <MailIcon className="size-3.5 text-muted-foreground" />
                      {person.email}
                    </span>
                  )}
                  {person.phone && (
                    <span className="flex items-center gap-1.5">
                      <PhoneIcon className="size-3.5 text-muted-foreground" />
                      {person.phone}
                    </span>
                  )}
                  {person.birthday && (
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5 text-muted-foreground" />
                      {personDisplayBirthday(person)}
                    </span>
                  )}
                </div>

                {/* Departamentos e funções */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  {memberships.map((m) => (
                    <Badge
                      key={m.id}
                      variant={m.isLeader ? "default" : "secondary"}
                      className="text-[11px] gap-1 py-0.5"
                    >
                      {m.isLeader && <CrownIcon className="size-3 text-amber-300" />}
                      {m.department.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 shrink-0">
              {isAdmin && !person.userId && person.email ? (
                <InvitePersonDialog
                  person={{
                    id: person.id,
                    name: personDisplayName(person),
                    email: person.email,
                    phone: person.phone,
                  }}
                />
              ) : null}

              {isAdmin ? (
                <EditPersonDialog
                  person={{
                    id: person.id,
                    name: person.name,
                    email: person.email,
                    phone: person.phone,
                    birthday: person.birthday,
                    userId: person.userId,
                    user: person.user
                      ? {
                          name: person.user.name,
                          email: person.user.email,
                          birthday: person.user.birthday,
                        }
                      : null,
                  }}
                />
              ) : null}

              {waPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-9 gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircleIcon className="size-4" />
                    WhatsApp
                  </a>
                </Button>
              )}

              <AnnouncementDialog
                departments={[]}
                people={[
                  {
                    id: person.id,
                    name: personDisplayName(person),
                    phone: person.phone,
                    hasAccount: Boolean(person.userId),
                  },
                ]}
                canBroadcastAll={false}
                isWhatsAppConfigured={Boolean(evolutionResult.config)}
                defaultAudienceType="person"
                defaultPersonId={person.id}
                trigger={
                  <Button size="sm" variant="default" className="h-9">
                    Enviar aviso
                  </Button>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Oração / Conversa Ativos */}
      {(activePrayerRequest || activeTalkRequest) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activePrayerRequest && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200">
              <HeartHandshakeIcon className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-sm">
                  Pedido de Oração Ativo
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {activePrayerRequest.notes
                    ? `"${activePrayerRequest.notes}"`
                    : "Solicitou oração em seu check-in diário recente."}
                </p>
                <span className="text-[11px] opacity-75 block">
                  Registrado em {activePrayerRequest.date}
                </span>
              </div>
            </div>
          )}

          {activeTalkRequest && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-950 dark:text-blue-200">
              <MessageSquareHeartIcon className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-sm">
                  Solicitou Conversa com a Liderança
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {activeTalkRequest.notes
                    ? `"${activeTalkRequest.notes}"`
                    : "Gostaria de conversar com um pastor ou líder de departamento."}
                </p>
                <span className="text-[11px] opacity-75 block">
                  Registrado em {activeTalkRequest.date}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Abas de Navegação do Perfil */}
      <Tabs defaultValue="schedules" className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md h-11 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="schedules" className="h-full text-xs sm:text-sm font-medium gap-1.5">
            <CalendarDaysIcon className="size-3.5" />
            Escalas ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="mood" className="h-full text-xs sm:text-sm font-medium gap-1.5">
            <SparklesIcon className="size-3.5" />
            Felicitômetro ({totalMoods})
          </TabsTrigger>
          <TabsTrigger value="unavailability" className="h-full text-xs sm:text-sm font-medium gap-1.5">
            <ShieldAlertIcon className="size-3.5" />
            Bloqueios ({unavailabilities.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: ESCALAS E CULTOS */}
        <TabsContent value="schedules" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3.5 rounded-xl border shadow-2xs">
              <p className="text-xs font-medium text-muted-foreground">
                Cultos Servidos
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {past.length}
              </p>
            </Card>
            <Card className="p-3.5 rounded-xl border shadow-2xs">
              <p className="text-xs font-medium text-muted-foreground">
                Próximas Escalas
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {upcoming.length}
              </p>
            </Card>
            <Card className="p-3.5 rounded-xl border shadow-2xs">
              <p className="text-xs font-medium text-muted-foreground">
                Departamentos
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {memberships.length}
              </p>
            </Card>
            <Card className="p-3.5 rounded-xl border shadow-2xs">
              <p className="text-xs font-medium text-muted-foreground">
                Média Sentimento
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {averageMood > 0 ? `${averageMood} ★` : "—"}
              </p>
            </Card>
          </div>

          {/* Próximas Escalas */}
          <Card className="rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">
                    Próximas Escalas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cultos e eventos futuros confirmados na agenda.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {upcoming.length} agendados
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {upcoming.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CalendarDaysIcon className="size-6 opacity-30 mx-auto mb-2" />
                  Nenhuma escala futura agendada para este membro.
                </div>
              ) : (
                upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/events/${item.schedule.event.id}`}
                          className="font-medium text-sm text-foreground hover:underline"
                        >
                          {item.schedule.event.title}
                        </Link>
                        <Badge variant="outline" className="text-xs">
                          {item.department.name}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ClockIcon className="size-3.5" />
                        <span>
                          {format(item.schedule.event.startsAt, "EEEE, dd 'de' MMMM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs py-1 px-2.5">
                        {item.function.name}
                      </Badge>
                      <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                        <Link href={`/dashboard/events/${item.schedule.event.id}`}>
                          Ver Culto
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Histórico Passado de Serviços */}
          <Card className="rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">
                    Histórico de Cultos Servidos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cultos anteriores em que a pessoa serviu na igreja.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {past.length} cultos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {past.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum registro de serviço anterior no sistema.
                </div>
              ) : (
                past.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.schedule.event.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {format(item.schedule.event.startsAt, "dd/MM/yyyy 'às' HH:mm")} •{" "}
                        {item.department.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="self-start sm:self-center">
                      {item.function.name}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: FELICITÔMETRO & HISTÓRICO */}
        <TabsContent value="mood" className="space-y-6">
          <Card className="rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">
                    Histórico de Sentimentos (Felicitômetro)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registros diários de humor e pedidos de oração (últimos 60 dias).
                  </CardDescription>
                </div>
                {averageMood > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <TrendingUpIcon className="size-3 text-emerald-500" />
                    Média: {averageMood} / 5.0
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {moodHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <SparklesIcon className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                  Nenhum check-in registrado por este membro ainda.
                </div>
              ) : (
                moodHistory.map((m) => {
                  const item = MOOD_LEVELS[m.score];
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-xs hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0" role="img">
                          {item.emoji}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold ${item.color}`}>
                              {item.label}
                            </span>
                            <span className="text-muted-foreground">
                              • {m.date}
                            </span>
                            {m.needsPrayer && (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              >
                                <HeartHandshakeIcon className="size-3" />
                                Oração
                              </Badge>
                            )}
                            {m.needsTalk && (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              >
                                <MessageSquareHeartIcon className="size-3" />
                                Conversa
                              </Badge>
                            )}
                          </div>
                          {m.notes && (
                            <p className="text-muted-foreground italic line-clamp-2">
                              &ldquo;{m.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: INDISPONIBILIDADES */}
        <TabsContent value="unavailability" className="space-y-6">
          <Card className="rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">
                    Datas Bloqueadas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dias em que o voluntário informou ausência para escalas de cultos.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {unavailabilities.length} bloqueios
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {unavailabilities.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhuma data pontual de indisponibilidade registrada.
                </div>
              ) : (
                unavailabilities.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {u.date}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {u.reason || "Sem motivo informado"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {u.allDay ? "Dia Todo" : "Períodos específicos"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemberPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}

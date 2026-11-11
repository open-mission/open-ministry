import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CrownIcon,
  HandHeartIcon,
} from "lucide-react";

import { AssignmentList } from "@/components/app/assignment-list";
import { BirthdaysCard } from "@/components/birthdays/birthdays-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { VerseOfTheDayCard } from "@/components/dashboard/verse-of-the-day-card";
import {
  UnreadAnnouncementsWidget,
  type UnreadAnnouncementItem,
} from "@/components/dashboard/unread-announcements-widget";
import {
  FelicitometroCard,
  type InitialMoodData,
} from "@/components/felicitometro/felicitometro-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AgendaEvent,
  PersonMembership,
  UpcomingAssignment,
} from "@/lib/agenda";
import type { BirthdayEntry } from "@/lib/birthdays";
import type { VerseOfTheDayData } from "@/lib/youversion";
import {
  eventDateParts,
  formatEventTimeRange,
} from "@/lib/events";

export function MemberDashboard({
  firstName,
  organizationName,
  birthdayEntries,
  memberships,
  assignments,
  agenda,
  initialMood,
  terminology,
  votd,
  unreadAnnouncements,
}: {
  firstName: string;
  organizationName: string;
  birthdayEntries: BirthdayEntry[];
  memberships: PersonMembership[];
  assignments: UpcomingAssignment[];
  agenda: AgendaEvent[];
  initialMood?: InitialMoodData;
  terminology?: {
    type: string;
    singular: string;
    plural: string;
  };
  votd?: VerseOfTheDayData;
  unreadAnnouncements?: UnreadAnnouncementItem[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-4 sm:gap-12">
      <header className="space-y-2">
        <h1 className="font-heading text-[2.15rem] leading-none tracking-tight text-balance sm:text-4xl">
          Olá, {firstName}.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Seus próximos encontros e a agenda de{" "}
          <span className="font-medium text-foreground">
            {organizationName}
          </span>
          .
        </p>
      </header>

      {/* 1. Versículo do Dia */}
      {votd ? <VerseOfTheDayCard verse={votd} /> : null}

      {/* 2. Últimos avisos não lidos */}
      {unreadAnnouncements && unreadAnnouncements.length > 0 ? (
        <UnreadAnnouncementsWidget initialAnnouncements={unreadAnnouncements} />
      ) : null}

      <QuickActions isAdmin={false} terminology={terminology} />

      <FelicitometroCard initialMood={initialMood} userName={firstName} />

      <MemberDepartments memberships={memberships} />

      <BirthdaysCard entries={birthdayEntries} />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="font-heading text-lg tracking-tight sm:text-xl">
                Minha escala
              </CardTitle>
              <CardDescription>
                Os encontros em que você foi escalado.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-9 shrink-0 text-xs">
              <Link href="/dashboard/schedules">
                Ver escalas
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ClipboardListIcon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Nenhuma escala futura
                  </p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Quando você for escalado, o encontro aparece aqui.
                  </p>
                </div>
              </div>
            ) : (
              <AssignmentList assignments={assignments} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="font-heading text-lg tracking-tight sm:text-xl">
                Agenda do departamento
              </CardTitle>
              <CardDescription>
                Os encontros dos seus departamentos.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-9 shrink-0 text-xs">
              <Link href="/dashboard/events">
                Ver agenda
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HandHeartIcon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Nenhum departamento ainda
                  </p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Quando você entrar em um departamento, a agenda aparece
                    aqui.
                  </p>
                </div>
              </div>
            ) : agenda.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CalendarDaysIcon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Nenhum encontro futuro
                  </p>
                  <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Os encontros dos seus departamentos aparecem aqui.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {agenda.map(({ event, departments }) => {
                  const parts = eventDateParts(event.startsAt);

                  return (
                    <li key={event.id}>
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50"
                      >
                        <span className="flex w-10 shrink-0 flex-col items-center">
                          <span className="font-heading text-xl leading-none">
                            {parts.day}
                          </span>
                          <span className="mt-0.5 text-[0.6rem] tracking-[0.12em] text-muted-foreground">
                            {parts.monthShort}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {event.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {parts.weekday} ·{" "}
                            {formatEventTimeRange(
                              event.startsAt,
                              event.endsAt,
                            )}{" "}
                            ·{" "}
                            {departments
                              .map((department) => department.name)
                              .join(", ")}
                          </p>
                        </div>
                        <ArrowRightIcon className="size-4 shrink-0 text-primary" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MemberDepartments({
  memberships,
}: {
  memberships: PersonMembership[];
}) {
  return (
    <section aria-labelledby="my-departments-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="my-departments-heading"
            className="font-heading text-lg leading-none tracking-tight sm:text-xl"
          >
            Meus departamentos
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Onde você serve e as funções que exerce.
          </p>
        </div>
        <Link
          href="/dashboard/departments"
          prefetch={true}
          className="group inline-flex shrink-0 items-center gap-1 pb-0.5 text-xs font-medium text-primary hover:underline"
        >
          Ver todos
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HandHeartIcon className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Você ainda não faz parte de um departamento
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Quando entrar em um departamento, ele aparece aqui com suas
              funções e a agenda.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-10">
            <Link href="/dashboard/departments" prefetch={true}>
              Conhecer departamentos
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((membership) => {
            const functions = membership.assignments
              .map((assignment) => assignment.function.name)
              .join(" · ");

            return (
              <Link
                key={membership.id}
                href={`/dashboard/departments/${membership.department.id}`}
                prefetch={true}
                className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-[transform,border-color,box-shadow] duration-150 active:scale-[0.99] hover:border-primary/35 hover:shadow-sm motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HandHeartIcon className="size-5" />
                  </span>
                  {membership.isLeader ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 font-normal"
                    >
                      <CrownIcon className="size-3" />
                      Líder
                    </Badge>
                  ) : null}
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="truncate font-heading text-base leading-tight tracking-tight">
                    {membership.department.name}
                  </p>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {functions || "Nenhuma função atribuída ainda."}
                  </p>
                </div>

                <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Abrir departamento
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

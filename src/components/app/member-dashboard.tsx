import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  HandHeartIcon,
  UsersIcon,
} from "lucide-react";

import { AssignmentList } from "@/components/app/assignment-list";
import { BirthdaysCard } from "@/components/birthdays/birthdays-card";
import { StatStrip } from "@/components/app/stat-strip";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  FelicitometroCard,
  type InitialMoodData,
} from "@/components/felicitometro/felicitometro-card";
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
import {
  eventDateParts,
  formatEventTimeRange,
} from "@/lib/events";

export function MemberDashboard({
  firstName,
  organizationName,
  peopleCount,
  birthdayEntries,
  memberships,
  assignments,
  agenda,
  initialMood,
}: {
  firstName: string;
  organizationName: string;
  peopleCount: number;
  birthdayEntries: BirthdayEntry[];
  memberships: PersonMembership[];
  assignments: UpcomingAssignment[];
  agenda: AgendaEvent[];
  initialMood?: InitialMoodData;
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

      <QuickActions isAdmin={false} />

      <FelicitometroCard initialMood={initialMood} userName={firstName} />

      <StatStrip
        items={[
          {
            icon: UsersIcon,
            label: "Pessoas",
            value: peopleCount,
            hint: "fazem parte da igreja",
          },
          {
            icon: ClipboardListIcon,
            label: "Minhas escalas",
            value: assignments.length,
            hint: "encontros futuros",
          },
          {
            icon: HandHeartIcon,
            label: "Meus departamentos",
            value: memberships.length,
            hint: "onde você serve",
          },
        ]}
      />

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

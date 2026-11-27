import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  MapPinIcon,
} from "lucide-react";

import { AvailabilityReminderWidget } from "@/components/availability/availability-reminder-widget";
import { birthdaysForCurrentMonth } from "@/components/home/birthdays-card";
import { buildWeekAttentionItems } from "@/components/home/week-attention-card";
import type {
  HomeAssignmentSummary,
  HomeEventSummary,
} from "@/components/home/home-types";
import { NotificationsCard, type NotificationItem } from "@/components/home/notifications-card";
import { Badge } from "@/components/ui/badge";
import type { BirthdayEntry, CalendarDate } from "@/lib/birthdays";
import {
  eventDateParts,
  formatEventFullDate,
  formatEventTimeRange,
  relativeDayLabel,
  type DepartmentCoverage,
} from "@/lib/events";
import { getInitials } from "@/lib/format";

export type DesktopHomeViewProps = {
  organizationName: string;
  greeting: string;
  firstName: string;
  dateLabel: string;
  nextAssignment: HomeAssignmentSummary | null;
  featuredEvent: HomeEventSummary | null;
  canManageOwnAvailability: boolean;
  availability: { hasSaved: boolean } | null;
  canManageSchedules: boolean;
  weekCoverage: DepartmentCoverage[];
  notifications: NotificationItem[];
  events: HomeEventSummary[];
  birthdays: BirthdayEntry[];
  today: CalendarDate;
  tasksSlot: ReactNode;
  verseSlot: ReactNode;
};

function HeroCard({ assignment }: { assignment: HomeAssignmentSummary }) {
  const event = assignment.schedule.event;
  const parts = eventDateParts(event.startsAt);
  const relativeDay = relativeDayLabel(event.startsAt);

  return (
    <section
      aria-labelledby="home-desktop-hero-title"
      className="rounded-2xl bg-[#1e472f] p-6 text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-[#faf7ee]/70 uppercase">
        Sua próxima escala
      </p>

      <p className="mt-1.5 text-[11px] font-medium text-[#faf7ee]/80 tabular-nums">
        {relativeDay ?? parts.weekday} ·{" "}
        {formatEventTimeRange(event.startsAt, event.endsAt)}
      </p>

      <h2
        id="home-desktop-hero-title"
        className="mt-2 font-heading text-2xl leading-tight tracking-tight xl:text-[28px]"
      >
        {event.title}
      </h2>

      <p className="mt-1.5 truncate text-xs text-[#faf7ee]/80">
        {assignment.department.name} · {assignment.function.name}
      </p>

      {event.location ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#faf7ee]/80">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.location}</span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex min-h-9 items-center justify-between gap-6 rounded-xl bg-[#faf7ee] px-4 text-sm font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
        >
          Abrir minha escala
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>

        <Link
          href="/schedules"
          className="inline-flex min-h-6 items-center gap-1 text-[11px] font-medium text-[#faf7ee]/80 underline-offset-4 transition-colors hover:text-[#faf7ee] hover:underline focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
        >
          Ver todas as escalas
        </Link>
      </div>
    </section>
  );
}

function FeaturedEventCard({ event }: { event: HomeEventSummary }) {
  return (
    <section
      aria-labelledby="home-desktop-featured-title"
      className="rounded-2xl bg-[#1e472f] p-6 text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-[#faf7ee]/70 uppercase">
        Próximo encontro da igreja
      </p>

      <p className="mt-1.5 text-[11px] font-medium text-[#faf7ee]/80">
        {formatEventFullDate(event.startsAt)} ·{" "}
        {formatEventTimeRange(event.startsAt, event.endsAt)}
      </p>

      <h2
        id="home-desktop-featured-title"
        className="mt-2 font-heading text-2xl leading-tight tracking-tight xl:text-[28px]"
      >
        {event.title}
      </h2>

      {event.location ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#faf7ee]/80">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.location}</span>
        </p>
      ) : null}

      <Link
        href={`/events/${event.id}`}
        className="mt-5 inline-flex min-h-9 items-center justify-between gap-6 rounded-xl bg-[#faf7ee] px-4 text-sm font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
      >
        Ver detalhes
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function FirstStepsCard({
  canManageAvailability,
}: {
  canManageAvailability: boolean;
}) {
  return (
    <section
      aria-labelledby="home-desktop-first-steps-title"
      className="rounded-2xl bg-[#1e472f] p-6 text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-[#faf7ee]/70 uppercase">
        Primeiros passos
      </p>

      <h2
        id="home-desktop-first-steps-title"
        className="mt-2 font-heading text-2xl leading-tight tracking-tight"
      >
        Nenhuma escala agendada ainda
      </h2>

      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#faf7ee]/80">
        {canManageAvailability
          ? "Conte quando você costuma estar livre para servir e a liderança poderá contar com você nas próximas escalas."
          : "Acompanhe a agenda da igreja para não perder os próximos encontros."}
      </p>

      <Link
        href={canManageAvailability ? "/availability" : "/calendar"}
        className="mt-5 inline-flex min-h-9 items-center justify-between gap-6 rounded-xl bg-[#faf7ee] px-4 text-sm font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
      >
        {canManageAvailability
          ? "Configurar disponibilidade"
          : "Abrir agenda"}
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function WeekAttention({
  departments,
}: {
  departments: DepartmentCoverage[];
}) {
  const items = buildWeekAttentionItems(departments);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="home-desktop-attention-title"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2
            id="home-desktop-attention-title"
            className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground"
          >
            Atenção da semana
          </h2>
          <Badge className="border-0 bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground tabular-nums">
            {items.length}
          </Badge>
        </div>
        <Link
          href="/schedules"
          className="inline-flex min-h-6 items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Gerenciar escalas
          <ArrowRightIcon className="size-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-border/70">
        {items.map((item) => (
          <div
            key={`${item.departmentId}:${item.eventId}`}
            className="flex items-center gap-3 py-2.5"
          >
            <span
              className="size-2 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.departmentName} · {item.eventTitle}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Falta: {item.missingFunctions.join(", ")}
              </p>
            </div>
            <Link
              href={`/events/${item.eventId}`}
              className="inline-flex min-h-6 shrink-0 items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Preencher
              <ArrowRightIcon className="size-3" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpcomingEvents({ events }: { events: HomeEventSummary[] }) {
  return (
    <section
      aria-labelledby="home-desktop-events-title"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="home-desktop-events-title"
          className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground"
        >
          Próximos encontros da igreja
        </h2>
        <Link
          href="/calendar"
          className="inline-flex min-h-6 items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Agenda completa
          <ArrowRightIcon className="size-3" aria-hidden="true" />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Nenhum encontro agendado por enquanto. Consulte a agenda para
          acompanhar novidades.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/70">
          {events.map((event) => {
            const parts = eventDateParts(event.startsAt);

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex min-h-11 items-center gap-3 py-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <span className="font-heading text-base leading-none font-semibold tabular-nums">
                    {parts.day}
                  </span>
                  <span className="mt-0.5 text-[11px] font-semibold tracking-[0.08em]">
                    {parts.monthShort}
                  </span>
                </span>

                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {event.title}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground tabular-nums">
                    {formatEventTimeRange(event.startsAt, event.endsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </span>

                <ChevronRightIcon
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BirthdaysFolio({
  entries,
  today,
}: {
  entries: BirthdayEntry[];
  today: CalendarDate;
}) {
  const monthEntries = birthdaysForCurrentMonth(entries, today);

  if (monthEntries.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="home-desktop-birthdays-title"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="home-desktop-birthdays-title"
          className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground"
        >
          Aniversariantes do mês
        </h2>
        <Link
          href="/birthdays"
          className="inline-flex min-h-6 items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Ver todos
          <ArrowRightIcon className="size-3" aria-hidden="true" />
        </Link>
      </div>

      <ul className="flex flex-col gap-1.5">
        {monthEntries.map((entry) => (
          <li key={entry.personId} className="flex items-center gap-2.5">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
              aria-hidden="true"
            >
              {getInitials(entry.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {entry.name}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {entry.day}/{entry.month}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Opção A — Caderno Pastoral (>= 1024px): cabeçalho editorial, papel aberto
 * à esquerda com a próxima escala e a agenda, e um fólio contínuo à direita
 * com versículo, tarefas, avisos e aniversariantes.
 */
export function DesktopHomeView({
  organizationName,
  greeting,
  firstName,
  dateLabel,
  nextAssignment,
  featuredEvent,
  canManageOwnAvailability,
  availability,
  canManageSchedules,
  weekCoverage,
  notifications,
  events,
  birthdays,
  today,
  tasksSlot,
  verseSlot,
}: DesktopHomeViewProps) {
  const showAvailability =
    canManageOwnAvailability && availability !== null && !availability.hasSaved;
  const hasNotifications = notifications.length > 0;
  const hasBirthdays = birthdaysForCurrentMonth(birthdays, today).length > 0;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            {dateLabel} · {organizationName}
          </p>
          <h1 className="font-heading text-[30px] leading-tight tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
        </div>

        {showAvailability ? (
          <AvailabilityReminderWidget
            variant="desktop-pill"
            hasSaved={availability.hasSaved}
            canManageAvailability={canManageOwnAvailability}
          />
        ) : null}
      </header>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_316px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        <div className="flex min-w-0 flex-col gap-7">
          {nextAssignment ? (
            <HeroCard assignment={nextAssignment} />
          ) : featuredEvent ? (
            <FeaturedEventCard event={featuredEvent} />
          ) : (
            <FirstStepsCard canManageAvailability={canManageOwnAvailability} />
          )}

          {canManageSchedules ? (
            <WeekAttention departments={weekCoverage} />
          ) : null}

          <UpcomingEvents events={events} />
        </div>

        <aside className="flex min-w-0 flex-col divide-y divide-border/70 rounded-[18px] border border-border/80 bg-muted/65 p-5 dark:bg-card">
          <div className="py-4 first:pt-0 last:pb-0">{verseSlot}</div>
          <div className="py-4 first:pt-0 last:pb-0">{tasksSlot}</div>
          {hasNotifications ? (
            <div className="py-4 first:pt-0 last:pb-0">
              <NotificationsCard
                announcements={notifications}
                variant="folio"
              />
            </div>
          ) : null}
          {hasBirthdays ? (
            <div className="py-4 first:pt-0 last:pb-0">
              <BirthdaysFolio entries={birthdays} today={today} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

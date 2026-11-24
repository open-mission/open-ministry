import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckSquare2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  MapPinIcon,
  Music2Icon,
} from "lucide-react";

import { AvailabilityReminderWidget } from "@/components/availability/availability-reminder-widget";
import { NotificationsCard, type NotificationItem } from "@/components/home/notifications-card";
import { WeekAttentionCard } from "@/components/home/week-attention-card";
import type {
  HomeAssignmentSummary,
  HomeEventSummary,
} from "@/components/home/home-types";
import { Button } from "@/components/ui/button";
import type { ModuleKey } from "@/lib/modules/types";
import {
  eventDateParts,
  formatEventFullDate,
  formatEventTimeRange,
  relativeDayLabel,
  type DepartmentCoverage,
} from "@/lib/events";
import { cn } from "@/lib/utils";

export type MobileHomeViewProps = {
  organizationName: string;
  greeting: string;
  firstName: string;
  nextAssignment: HomeAssignmentSummary | null;
  featuredEvent: HomeEventSummary | null;
  canManageOwnAvailability: boolean;
  availability: { hasSaved: boolean } | null;
  canManageSchedules: boolean;
  weekCoverage: DepartmentCoverage[];
  accessibleModuleKeys: ModuleKey[];
  notifications: NotificationItem[];
  events: HomeEventSummary[];
  tasksSlot: ReactNode;
  verseSlot: ReactNode;
};

type Shortcut = {
  href: string;
  label: string;
  icon: typeof CalendarDaysIcon;
};

function HeroCard({ assignment }: { assignment: HomeAssignmentSummary }) {
  const event = assignment.schedule.event;
  const parts = eventDateParts(event.startsAt);
  const relativeDay = relativeDayLabel(event.startsAt);

  return (
    <section
      aria-labelledby="home-mobile-hero-title"
      className="rounded-2xl bg-[#1e472f] p-5 text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#faf7ee]/70 uppercase">
        Sua próxima escala
      </p>

      <p className="mt-1 text-[11px] font-medium text-[#faf7ee]/80 tabular-nums">
        {relativeDay ?? parts.weekday} ·{" "}
        {formatEventTimeRange(event.startsAt, event.endsAt)}
      </p>

      <h2
        id="home-mobile-hero-title"
        className="mt-2 font-heading text-xl leading-tight tracking-tight"
      >
        {event.title}
      </h2>

      <p className="mt-1 truncate text-xs text-[#faf7ee]/80">
        {assignment.department.name} · {assignment.function.name}
      </p>

      {event.location ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#faf7ee]/80">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.location}</span>
        </p>
      ) : null}

      <Link
        href={`/dashboard/events/${event.id}`}
        className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#faf7ee] px-4 text-sm font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
      >
        Abrir minha escala
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function FeaturedEventCard({ event }: { event: HomeEventSummary }) {
  return (
    <section
      aria-labelledby="home-mobile-featured-title"
      className="rounded-2xl bg-[#1e472f] p-5 text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#faf7ee]/70 uppercase">
        Próximo encontro da igreja
      </p>

      <p className="mt-1 text-[11px] font-medium text-[#faf7ee]/80">
        {formatEventFullDate(event.startsAt)} ·{" "}
        {formatEventTimeRange(event.startsAt, event.endsAt)}
      </p>

      <h2
        id="home-mobile-featured-title"
        className="mt-2 font-heading text-xl leading-tight tracking-tight"
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
        href={`/dashboard/events/${event.id}`}
        className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#faf7ee] px-4 text-sm font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
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
      aria-labelledby="home-mobile-first-steps-title"
      className="rounded-2xl bg-[#1e472f] p-5 text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#faf7ee]/70 uppercase">
        Primeiros passos
      </p>

      <h2
        id="home-mobile-first-steps-title"
        className="mt-2 font-heading text-xl leading-tight tracking-tight"
      >
        Nenhuma escala agendada ainda
      </h2>

      <p className="mt-1 text-xs leading-relaxed text-[#faf7ee]/80">
        {canManageAvailability
          ? "Conte quando você costuma estar livre para servir."
          : "Acompanhe a agenda da igreja para não perder os próximos encontros."}
      </p>

      <Link
        href={canManageAvailability ? "/availability" : "/calendar"}
        className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#faf7ee] px-4 text-sm font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
      >
        {canManageAvailability
          ? "Configurar disponibilidade"
          : "Abrir agenda"}
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function Shortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <nav aria-label="Atalhos da home">
      <ul
        className={cn(
          "grid",
          shortcuts.length === 4
            ? "grid-cols-4 gap-2"
            : "grid-cols-3 gap-2",
        )}
      >
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <li key={shortcut.href}>
              <Link
                href={shortcut.href}
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-card px-1 py-2 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <span className="truncate">{shortcut.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UpcomingEvents({ events }: { events: HomeEventSummary[] }) {
  return (
    <section
      aria-labelledby="home-mobile-events-title"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="home-mobile-events-title"
          className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground"
        >
          Próximos eventos
        </h2>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 min-h-11 px-2 text-xs text-primary hover:text-primary"
        >
          <Link href="/calendar">
            Agenda
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-border/70 bg-card p-4">
          <p className="font-heading text-base text-foreground">
            Nenhum evento próximo
          </p>
          <p className="text-xs text-muted-foreground">
            Consulte a agenda para ver os encontros da igreja.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-1 min-h-11"
          >
            <Link href="/calendar">Agenda</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/70 rounded-xl border border-border/70 bg-card px-4">
          {events.map((event) => {
            const parts = eventDateParts(event.startsAt);

            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex min-h-11 items-center gap-3 py-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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

/**
 * Direção A — Companhia Pastoral (< 1024px): saudação, próxima escala em
 * destaque, atalhos táteis, versículo do dia e blocos condicionais em um
 * ritmo vertical único para mobile e tablet.
 */
export function MobileHomeView({
  organizationName,
  greeting,
  firstName,
  nextAssignment,
  featuredEvent,
  canManageOwnAvailability,
  availability,
  canManageSchedules,
  weekCoverage,
  accessibleModuleKeys,
  notifications,
  events,
  tasksSlot,
  verseSlot,
}: MobileHomeViewProps) {
  const shortcuts: Shortcut[] = [
    { href: "/schedules", label: "Escalas", icon: ClipboardListIcon },
    { href: "/calendar", label: "Agenda", icon: CalendarDaysIcon },
    ...(accessibleModuleKeys.includes("music")
      ? [{ href: "/songs", label: "Repertório", icon: Music2Icon }]
      : []),
    { href: "/tasks", label: "Tarefas", icon: CheckSquare2Icon },
  ];

  const showAvailability =
    canManageOwnAvailability && availability !== null && !availability.hasSaved;

  return (
    <div className="@container flex flex-col gap-6">
      <header className="space-y-1">
        <p className="truncate text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {organizationName}
        </p>
        <h1 className="font-heading text-2xl leading-tight tracking-tight text-foreground">
          {greeting}, {firstName}
        </h1>
      </header>

      <div className="grid gap-4 @xl:grid-cols-2 @xl:items-start">
        <div className="flex flex-col gap-4">
          {nextAssignment ? (
            <HeroCard assignment={nextAssignment} />
          ) : featuredEvent ? (
            <FeaturedEventCard event={featuredEvent} />
          ) : (
            <FirstStepsCard canManageAvailability={canManageOwnAvailability} />
          )}

          <Shortcuts shortcuts={shortcuts} />
        </div>

        <div className="min-w-0">{verseSlot}</div>
      </div>

      {showAvailability ? (
        <AvailabilityReminderWidget
          variant="home"
          hasSaved={availability.hasSaved}
          canManageAvailability={canManageOwnAvailability}
        />
      ) : null}

      {canManageSchedules ? (
        <WeekAttentionCard departments={weekCoverage} canManage />
      ) : null}

      <NotificationsCard
        announcements={notifications}
        variant="mobile-strip"
      />

      <div className="grid gap-4 @xl:grid-cols-2 @xl:items-start">
        <div className="min-w-0">{tasksSlot}</div>
        <UpcomingEvents events={events} />
      </div>
    </div>
  );
}

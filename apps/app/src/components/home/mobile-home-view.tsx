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
  hideHeader?: boolean;
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
  shortLabel: string;
  tabletLabel: string;
  icon: typeof CalendarDaysIcon;
};

function HeroStatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#faf7ee]">
      <span
        className="size-1.5 shrink-0 rounded-full bg-[#9ec8ab]"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function HeroCard({ assignment }: { assignment: HomeAssignmentSummary }) {
  const event = assignment.schedule.event;
  const parts = eventDateParts(event.startsAt);
  const relativeDay = relativeDayLabel(event.startsAt);

  return (
    <section
      aria-labelledby="home-mobile-hero-title"
      className="flex h-full flex-col rounded-[18px] bg-[#1e472f] p-[18px] text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HeroStatusPill label="Sua próxima escala" />
        <p className="text-[11px] font-medium text-[#c7d9cc] tabular-nums">
          {relativeDay ?? parts.weekday} ·{" "}
          {formatEventTimeRange(event.startsAt, event.endsAt)}
        </p>
      </div>

      <h2
        id="home-mobile-hero-title"
        className="mt-2.5 font-heading text-xl leading-tight tracking-tight"
      >
        {event.title}
      </h2>

      <p className="mt-1 truncate text-xs text-[#c7d9cc]">
        {assignment.department.name} · {assignment.function.name}
      </p>

      {event.location ? (
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#c7d9cc]">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.location}</span>
        </p>
      ) : null}

      <div className="mt-4 md:mt-auto md:pt-4">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#faf7ee] px-4 text-[13px] font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
        >
          Abrir minha escala
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function FeaturedEventCard({ event }: { event: HomeEventSummary }) {
  return (
    <section
      aria-labelledby="home-mobile-featured-title"
      className="flex h-full flex-col rounded-[18px] bg-[#1e472f] p-[18px] text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HeroStatusPill label="Próximo encontro da igreja" />
        <p className="text-[11px] font-medium text-[#c7d9cc] tabular-nums">
          {formatEventFullDate(event.startsAt)} ·{" "}
          {formatEventTimeRange(event.startsAt, event.endsAt)}
        </p>
      </div>

      <h2
        id="home-mobile-featured-title"
        className="mt-2.5 font-heading text-xl leading-tight tracking-tight"
      >
        {event.title}
      </h2>

      {event.location ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#c7d9cc]">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.location}</span>
        </p>
      ) : null}

      <div className="mt-4 md:mt-auto md:pt-4">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#faf7ee] px-4 text-[13px] font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
        >
          Ver detalhes
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
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
      className="flex h-full flex-col rounded-[18px] bg-[#1e472f] p-[18px] text-[#faf7ee] dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HeroStatusPill label="Primeiros passos" />
      </div>

      <h2
        id="home-mobile-first-steps-title"
        className="mt-2.5 font-heading text-xl leading-tight tracking-tight"
      >
        Nenhuma escala agendada ainda
      </h2>

      <p className="mt-1 text-xs leading-relaxed text-[#c7d9cc]">
        {canManageAvailability
          ? "Conte quando você costuma estar livre para servir."
          : "Acompanhe a agenda da igreja para não perder os próximos encontros."}
      </p>

      <div className="mt-4 md:mt-auto md:pt-4">
        <Link
          href={canManageAvailability ? "/availability" : "/calendar"}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-[#faf7ee] px-4 text-[13px] font-semibold text-[#16231a] transition-colors hover:bg-[#f1eade] focus-visible:ring-2 focus-visible:ring-[#faf7ee] focus-visible:outline-none"
        >
          {canManageAvailability
            ? "Configurar disponibilidade"
            : "Abrir agenda"}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function Shortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <nav aria-label="Atalhos da home">
      <ul
        className={cn(
          "grid gap-2 md:grid-cols-2",
          shortcuts.length === 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {shortcuts.map((shortcut, index) => {
          const Icon = shortcut.icon;
          const isSingleLabel = shortcut.shortLabel === shortcut.tabletLabel;

          return (
            <li
              key={shortcut.href}
              className={cn(
                shortcuts.length === 3 && index === 2 && "md:col-span-2",
              )}
            >
              <Link
                href={shortcut.href}
                className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-card px-1 py-2 text-[11px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-12 md:flex-row md:justify-start md:gap-2 md:px-3 md:py-0 md:text-xs"
              >
                <Icon
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {isSingleLabel ? (
                  <span className="truncate">{shortcut.shortLabel}</span>
                ) : (
                  <>
                    <span className="truncate md:hidden">
                      {shortcut.shortLabel}
                    </span>
                    <span className="hidden truncate md:inline">
                      {shortcut.tabletLabel}
                    </span>
                  </>
                )}
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
  hideHeader = false,
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
    {
      href: "/schedules",
      shortLabel: "Escalas",
      tabletLabel: "Minhas escalas",
      icon: ClipboardListIcon,
    },
    {
      href: "/calendar",
      shortLabel: "Agenda",
      tabletLabel: "Agenda",
      icon: CalendarDaysIcon,
    },
    ...(accessibleModuleKeys.includes("music")
      ? [
          {
            href: "/songs",
            shortLabel: "Repertório",
            tabletLabel: "Repertório",
            icon: Music2Icon,
          },
        ]
      : []),
    {
      href: "/tasks",
      shortLabel: "Tarefas",
      tabletLabel: "Minhas tarefas",
      icon: CheckSquare2Icon,
    },
  ];

  const showAvailability =
    canManageOwnAvailability && availability !== null && !availability.hasSaved;

  return (
    <div className="flex flex-col gap-5">
      {hideHeader ? null : (
        <header className="space-y-1">
          <p className="truncate text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {organizationName}
          </p>
          <h1 className="font-heading text-2xl leading-tight tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
        </header>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
        <div className="flex min-w-0 flex-col">
          {nextAssignment ? (
            <HeroCard assignment={nextAssignment} />
          ) : featuredEvent ? (
            <FeaturedEventCard event={featuredEvent} />
          ) : (
            <FirstStepsCard canManageAvailability={canManageOwnAvailability} />
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-2.5">
          <Shortcuts shortcuts={shortcuts} />
          <div className="min-w-0">{verseSlot}</div>
        </div>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <div className="min-w-0">{tasksSlot}</div>
        <UpcomingEvents events={events} />
      </div>
    </div>
  );
}

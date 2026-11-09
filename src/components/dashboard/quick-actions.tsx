"use client";

import Link from "next/link";
import type { Icon } from "@tabler/icons-react";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconClipboardList,
  IconHeartHandshake,
  IconSpeakerphone,
  IconStack2,
  IconUserCircle,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";

import { AnnouncementDialog } from "@/components/notifications/announcement-dialog";
import { CreateEventDialog } from "@/components/events/create-event-dialog";
import { CreatePersonDialog } from "@/components/people/create-person-dialog";
import { cn } from "@/lib/utils";

type DepartmentOption = {
  id: string;
  name: string;
};

type PersonOption = {
  id: string;
  name: string;
  phone?: string | null;
  hasAccount?: boolean;
  departmentNames?: string[];
};

const tileClassName = cn(
  "group flex min-w-[196px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-xs",
  "transition-[transform,border-color,box-shadow] duration-150 active:scale-[0.99]",
  "hover:border-primary/35 hover:shadow-sm sm:min-w-0",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
);

const iconClassName =
  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200";

function QuickActionContent({
  icon: Icon,
  label,
  hint,
  iconTone,
}: {
  icon: Icon;
  label: string;
  hint: string;
  iconTone: string;
}) {
  return (
    <>
      <span className={cn(iconClassName, iconTone)}>
        <Icon className="size-5" stroke={1.5} />
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block truncate text-sm font-medium leading-tight text-foreground">
          {label}
        </span>
        <span className="block truncate text-xs leading-tight text-muted-foreground">
          {hint}
        </span>
      </span>
    </>
  );
}

export function QuickActions({
  isAdmin = false,
  departments = [],
  people = [],
  isWhatsAppConfigured = false,
  defaultDate = "",
  terminology = {
    type: "departments",
    singular: "Departamento",
    plural: "Departamentos",
  },
}: {
  isAdmin?: boolean;
  departments?: DepartmentOption[];
  people?: PersonOption[];
  isWhatsAppConfigured?: boolean;
  defaultDate?: string;
  terminology?: {
    type: string;
    singular: string;
    plural: string;
  };
}) {
  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="quick-actions-heading"
          className="font-heading text-lg leading-none tracking-tight sm:text-xl"
        >
          Acessos rápidos
        </h2>
        <span className="pb-0.5 text-[0.68rem] text-muted-foreground/75 sm:hidden">
          Arraste para o lado &rarr;
        </span>
      </div>

      <div className="flex w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-0.5 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <CreateEventDialog
              departments={departments}
              defaultDate={defaultDate}
              trigger={
                <button
                  type="button"
                  className={tileClassName}
                  aria-label="Criar novo culto ou evento"
                >
                  <QuickActionContent
                    icon={IconCalendarPlus}
                    label="Novo culto"
                    hint="Criar evento"
                    iconTone="bg-primary/10 text-primary group-hover:bg-primary/20"
                  />
                </button>
              }
            />

            <AnnouncementDialog
              departments={departments}
              people={people}
              canBroadcastAll={isAdmin}
              isWhatsAppConfigured={isWhatsAppConfigured}
              trigger={
                <button
                  type="button"
                  className={tileClassName}
                  aria-label="Enviar aviso para a igreja ou departamentos"
                >
                  <QuickActionContent
                    icon={IconSpeakerphone}
                    label="Enviar aviso"
                    hint="Multicanal"
                    iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20"
                  />
                </button>
              }
            />

            <CreatePersonDialog
              trigger={
                <button
                  type="button"
                  className={tileClassName}
                  aria-label="Cadastrar nova pessoa"
                >
                  <QuickActionContent
                    icon={IconUserPlus}
                    label="Nova pessoa"
                    hint="Cadastrar"
                    iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20"
                  />
                </button>
              }
            />

            <Link
              href="/dashboard/schedules"
              className={tileClassName}
              aria-label="Gerenciar escalas"
            >
              <QuickActionContent
                icon={IconClipboardList}
                label="Escalas"
                hint="Gerenciar"
                iconTone="bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20"
              />
            </Link>

            <Link
              href="/dashboard/calendar"
              className={tileClassName}
              aria-label="Abrir agenda"
            >
              <QuickActionContent
                icon={IconCalendarEvent}
                label="Agenda"
                hint="Calendário"
                iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20"
              />
            </Link>

            <Link
              href="/dashboard/departments"
              className={tileClassName}
              aria-label={`Abrir ${terminology.plural.toLowerCase()}`}
            >
              <QuickActionContent
                icon={IconStack2}
                label={terminology.plural}
                hint={terminology.type === "departments" ? "Ministérios" : "Equipes"}
                iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500/20"
              />
            </Link>

            <Link
              href="/dashboard/members?tab=felicitometro"
              className={tileClassName}
              aria-label="Abrir cuidado pastoral"
            >
              <QuickActionContent
                icon={IconHeartHandshake}
                label="Cuidado"
                hint="Pastoral"
                iconTone="bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20"
              />
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard/schedules"
              className={tileClassName}
              aria-label="Ver minhas escalas"
            >
              <QuickActionContent
                icon={IconClipboardList}
                label="Minhas escalas"
                hint="Onde sirvo"
                iconTone="bg-primary/10 text-primary group-hover:bg-primary/20"
              />
            </Link>

            <Link
              href="/dashboard/calendar"
              className={tileClassName}
              aria-label="Abrir agenda"
            >
              <QuickActionContent
                icon={IconCalendarEvent}
                label="Agenda"
                hint="Calendário"
                iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20"
              />
            </Link>

            <Link
              href="/dashboard/departments"
              className={tileClassName}
              aria-label={`Abrir ${terminology.plural.toLowerCase()}`}
            >
              <QuickActionContent
                icon={IconStack2}
                label={terminology.plural}
                hint={terminology.type === "departments" ? "Ministérios" : "Equipes"}
                iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500/20"
              />
            </Link>

            <Link
              href="/dashboard/members"
              className={tileClassName}
              aria-label="Ver pessoas"
            >
              <QuickActionContent
                icon={IconUsers}
                label="Pessoas"
                hint="Irmãos na fé"
                iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20"
              />
            </Link>

            <Link
              href="/dashboard/notifications"
              className={tileClassName}
              aria-label="Ver avisos"
            >
              <QuickActionContent
                icon={IconSpeakerphone}
                label="Avisos"
                hint="Comunicados"
                iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20"
              />
            </Link>

            <Link
              href="/dashboard/profile"
              className={tileClassName}
              aria-label="Abrir meu perfil"
            >
              <QuickActionContent
                icon={IconUserCircle}
                label="Meu perfil"
                hint="Dados e senha"
                iconTone="bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20"
              />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

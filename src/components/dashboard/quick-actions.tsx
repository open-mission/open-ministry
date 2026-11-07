"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ClipboardListIcon,
  HeartHandshakeIcon,
  LayersIcon,
  MegaphoneIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react";

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
  "group flex min-w-[112px] shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/60 bg-card/80 p-3.5 text-center shadow-xs",
  "transition-[transform,border-color,background-color,box-shadow] duration-150 active:scale-[0.97]",
  "hover:border-primary/35 hover:bg-card hover:shadow-sm sm:min-w-0",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
);

const iconClassName =
  "flex size-12 items-center justify-center rounded-2xl transition-colors duration-200";

function QuickActionContent({
  icon: Icon,
  label,
  hint,
  iconTone,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  iconTone: string;
}) {
  return (
    <>
      <span className={cn(iconClassName, iconTone)}>
        <Icon className="size-[22px]" />
      </span>
      <span className="space-y-0.5">
        <span className="block text-[0.72rem] font-medium leading-tight text-foreground">
          {label}
        </span>
        <span className="hidden text-[0.68rem] leading-tight text-muted-foreground sm:block">
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
}: {
  isAdmin?: boolean;
  departments?: DepartmentOption[];
  people?: PersonOption[];
  isWhatsAppConfigured?: boolean;
  defaultDate?: string;
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

      <div className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1.5 pt-0.5 snap-x snap-mandatory scroll-pl-4 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:px-0 lg:grid-cols-7">
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
                    icon={CalendarPlusIcon}
                    label="Novo culto"
                    hint="Criar evento"
                    iconTone="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
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
                    icon={MegaphoneIcon}
                    label="Enviar aviso"
                    hint="Multicanal"
                    iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
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
                    icon={UserPlusIcon}
                    label="Nova pessoa"
                    hint="Cadastrar"
                    iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white"
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
                icon={ClipboardListIcon}
                label="Escalas"
                hint="Gerenciar"
                iconTone="bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/calendar"
              className={tileClassName}
              aria-label="Abrir agenda"
            >
              <QuickActionContent
                icon={CalendarDaysIcon}
                label="Agenda"
                hint="Calendário"
                iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/departments"
              className={tileClassName}
              aria-label="Abrir ministérios"
            >
              <QuickActionContent
                icon={LayersIcon}
                label="Ministérios"
                hint="Equipes"
                iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/members?tab=felicitometro"
              className={tileClassName}
              aria-label="Abrir cuidado pastoral"
            >
              <QuickActionContent
                icon={HeartHandshakeIcon}
                label="Cuidado"
                hint="Pastoral"
                iconTone="bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white"
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
                icon={ClipboardListIcon}
                label="Minhas escalas"
                hint="Onde sirvo"
                iconTone="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
              />
            </Link>

            <Link
              href="/dashboard/calendar"
              className={tileClassName}
              aria-label="Abrir agenda"
            >
              <QuickActionContent
                icon={CalendarDaysIcon}
                label="Agenda"
                hint="Calendário"
                iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/departments"
              className={tileClassName}
              aria-label="Abrir departamentos"
            >
              <QuickActionContent
                icon={LayersIcon}
                label="Departamentos"
                hint="Ministérios"
                iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/members"
              className={tileClassName}
              aria-label="Ver pessoas"
            >
              <QuickActionContent
                icon={UserCheckIcon}
                label="Pessoas"
                hint="Irmãos na fé"
                iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/notifications"
              className={tileClassName}
              aria-label="Ver avisos"
            >
              <QuickActionContent
                icon={MegaphoneIcon}
                label="Avisos"
                hint="Comunicados"
                iconTone="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
              />
            </Link>

            <Link
              href="/dashboard/profile"
              className={tileClassName}
              aria-label="Abrir meu perfil"
            >
              <QuickActionContent
                icon={UserRoundIcon}
                label="Meu perfil"
                hint="Dados e senha"
                iconTone="bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
              />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

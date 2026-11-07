"use client";

import Link from "next/link";
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
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="quick-actions-heading"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Acessos Rápidos
        </h2>
        <span className="text-[0.68rem] text-muted-foreground/80 sm:hidden">
          Arraste para o lado &rarr;
        </span>
      </div>

      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:grid sm:px-0 sm:gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {isAdmin ? (
          <>
            <CreateEventDialog
              departments={departments}
              defaultDate={defaultDate}
              trigger={
                <button
                  type="button"
                  className={cn(
                    "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                    "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
                  )}
                  aria-label="Criar novo culto ou evento"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                    <CalendarPlusIcon className="size-5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      Novo Culto
                    </p>
                    <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                      Criar evento
                    </p>
                  </div>
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
                  className={cn(
                    "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                    "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
                  )}
                  aria-label="Enviar aviso para a igreja ou departamentos"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors duration-200 group-hover:bg-amber-500 group-hover:text-white">
                    <MegaphoneIcon className="size-5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      Enviar Aviso
                    </p>
                    <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                      Multicanal
                    </p>
                  </div>
                </button>
              }
            />

            <CreatePersonDialog
              trigger={
                <button
                  type="button"
                  className={cn(
                    "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                    "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
                  )}
                  aria-label="Cadastrar nova pessoa"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white">
                    <UserPlusIcon className="size-5" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      Nova Pessoa
                    </p>
                    <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                      Cadastrar
                    </p>
                  </div>
                </button>
              }
            />

            <Link
              href="/dashboard/schedules"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors duration-200 group-hover:bg-blue-600 group-hover:text-white">
                <ClipboardListIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Escalas</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Gerenciar
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/calendar"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-colors duration-200 group-hover:bg-violet-600 group-hover:text-white">
                <CalendarDaysIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Agenda</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Calendário
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/departments"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 transition-colors duration-200 group-hover:bg-orange-600 group-hover:text-white">
                <LayersIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">
                  Ministérios
                </p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Equipes
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/members?tab=felicitometro"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors duration-200 group-hover:bg-rose-600 group-hover:text-white">
                <HeartHandshakeIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Cuidado</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Pastoral
                </p>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard/schedules"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                <ClipboardListIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Minhas Escalas</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Onde sirvo
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/calendar"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-colors duration-200 group-hover:bg-violet-600 group-hover:text-white">
                <CalendarDaysIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Agenda</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Calendário
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/departments"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 transition-colors duration-200 group-hover:bg-orange-600 group-hover:text-white">
                <LayersIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Departamentos</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Ministérios
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/members"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white">
                <UserCheckIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Pessoas</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Irmãos na fé
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/notifications"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors duration-200 group-hover:bg-amber-500 group-hover:text-white">
                <MegaphoneIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Avisos</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Comunicados
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/profile"
              className={cn(
                "group flex min-w-[105px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 text-center transition-all duration-200",
                "hover:border-primary/40 hover:bg-card hover:shadow-sm active:scale-[0.98] sm:min-w-0 sm:p-3.5",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors duration-200 group-hover:bg-blue-600 group-hover:text-white">
                <UserRoundIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">Meu Perfil</p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Dados e senha
                </p>
              </div>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

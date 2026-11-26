"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  CompassIcon,
  DownloadIcon,
  HomeIcon,
  MusicIcon,
  ShareIcon,
  SmartphoneIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WelcomeGuideChapter {
  id: string;
  desktopTitle: string;
  mobileTitle: string;
  desktopSummary: string;
  mobileSummary: string;
}

/**
 * Os três capítulos do guia. O conteúdo é compartilhado pelo Sheet (desktop) e
 * pelo Drawer (mobile); só os títulos e resumos mudam de acordo com o tamanho
 * da tela.
 */
export const WELCOME_GUIDE_CHAPTERS: WelcomeGuideChapter[] = [
  {
    id: "areas",
    desktopTitle: "1 · Onde tudo fica",
    mobileTitle: "1 · Conheça o botão Explorar",
    desktopSummary: "O menu à esquerda reúne a igreja em 6 áreas simples.",
    mobileSummary: "A barra inferior e o botão Explorar.",
  },
  {
    id: "schedules",
    desktopTitle: "2 · Suas escalas e avisos",
    mobileTitle: "2 · Suas escalas e avisos",
    desktopSummary: "Confirmar presença e avisar disponibilidade",
    mobileSummary: "Confirmar presença e ver Hoje | Minha Igreja",
  },
  {
    id: "profile",
    desktopTitle: "3 · Seu perfil e o app no celular",
    mobileTitle: "3 · Perfil e tela inicial",
    desktopSummary: "Sem pressa — complete dados quando preferir.",
    mobileSummary: "Sem pressa — complete dados quando preferir.",
  },
];

const AREA_PREVIEWS: {
  name: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    name: "Cultos & Escalas",
    description: "Agenda, escalas e disponibilidade",
    icon: CalendarCheckIcon,
  },
  {
    name: "Louvor",
    description: "Músicas, cifras e ensaios",
    icon: MusicIcon,
  },
  {
    name: "Pessoas",
    description: "Membros, equipes e aniversários",
    icon: UsersIcon,
  },
];

const MOBILE_BAR_ITEMS: {
  label: string;
  icon: LucideIcon;
  highlighted?: boolean;
}[] = [
  { label: "Início", icon: HomeIcon },
  { label: "Escalas", icon: CalendarCheckIcon },
  { label: "Agenda", icon: CalendarDaysIcon },
  { label: "Músicas", icon: MusicIcon },
  { label: "Explorar", icon: CompassIcon, highlighted: true },
];

export interface WelcomeGuideContentProps {
  activeChapter: number;
  onSelectChapter: (index: number) => void;
  onSkip: () => void;
  onNext: () => void;
  isMobile: boolean;
  initialPhone?: string | null;
  initialBirthday?: string | null;
}

export function WelcomeGuideContent({
  activeChapter,
  onSelectChapter,
  onSkip,
  onNext,
  isMobile,
  initialPhone,
  initialBirthday,
}: WelcomeGuideContentProps) {
  const isLastChapter = activeChapter >= WELCOME_GUIDE_CHAPTERS.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        data-vaul-no-drag=""
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch] md:px-5"
      >
        <div className="space-y-2">
          {WELCOME_GUIDE_CHAPTERS.map((chapter, index) => {
            const isActive = index === activeChapter;
            const title = isMobile ? chapter.mobileTitle : chapter.desktopTitle;
            const summary = isMobile
              ? chapter.mobileSummary
              : chapter.desktopSummary;

            return (
              <section
                key={chapter.id}
                className={cn(
                  "overflow-hidden rounded-xl border transition-colors motion-reduce:transition-none",
                  isActive
                    ? "border-primary/40 bg-background/70"
                    : "border-border bg-background/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectChapter(index)}
                  aria-expanded={isActive}
                  aria-controls={`welcome-guide-chapter-${chapter.id}`}
                  className={cn(
                    "flex min-h-11 w-full items-start gap-2.5 px-3 py-2.5 text-left outline-none transition-colors motion-reduce:transition-none md:min-h-9",
                    "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                    isActive ? "bg-muted/20" : "bg-transparent",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors motion-reduce:transition-none",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="font-heading text-sm font-semibold leading-snug tracking-tight text-foreground">
                        {title}
                      </span>
                      {isActive ? (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[11px] font-medium text-primary"
                        >
                          Agora
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                      {summary}
                    </span>
                  </span>

                  <ChevronDownIcon
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                      isActive ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>

                {isActive ? (
                  <div
                    id={`welcome-guide-chapter-${chapter.id}`}
                    role="region"
                    aria-label={title}
                    className="animate-in fade-in-0 slide-in-from-top-1 px-3 pb-3 duration-200 motion-reduce:animate-none"
                  >
                    {chapter.id === "areas" ? (
                      <AreasChapter isMobile={isMobile} />
                    ) : null}
                    {chapter.id === "schedules" ? <SchedulesChapter /> : null}
                    {chapter.id === "profile" ? (
                      <ProfileChapter
                        initialPhone={initialPhone}
                        initialBirthday={initialBirthday}
                        isMobile={isMobile}
                      />
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <footer
        className={cn(
          "shrink-0 border-t border-border px-4 pt-3 md:px-5",
          isMobile
            ? "pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "pb-4",
        )}
      >
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {isMobile
            ? "Rever tour fica sempre disponível no menu do seu avatar no topo."
            : "Você pode rever este guia quando quiser no menu do seu avatar."}
        </p>

        <div className="mt-2.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            className="min-h-11 w-full text-xs text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none md:min-h-9 md:w-auto"
          >
            Pular por agora
          </Button>

          <Button
            type="button"
            onClick={onNext}
            className="min-h-11 w-full gap-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none md:min-h-9 md:w-auto"
          >
            <span>{isLastChapter ? "Concluir guia" : "Próximo capítulo"}</span>
            {isLastChapter ? (
              <CheckIcon aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function AreasChapter({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Na barra inferior você acessa Início, Escalas, Agenda e Músicas.
          Toque em Explorar para abrir todas as 6 áreas da igreja.
        </p>

        <div className="rounded-xl border border-border bg-background p-2">
          <div className="grid grid-cols-5 gap-0.5">
            {MOBILE_BAR_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] leading-tight",
                    item.highlighted
                      ? "border border-primary/30 bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span className="max-w-full truncate">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          No Explorar ficam também Comunicação, Bíblia e todas as demais áreas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        O menu à esquerda reúne a igreja em 6 áreas simples: Cultos &amp;
        Escalas, Louvor, Pessoas, Comunicação, Bíblia e Início.
      </p>

      <div className="grid grid-cols-1 gap-1.5">
        {AREA_PREVIEWS.map((area) => {
          const Icon = area.icon;

          return (
            <div
              key={area.name}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-2.5 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-foreground">
                  {area.name}
                </span>
                <span className="block text-[11px] leading-relaxed text-muted-foreground">
                  {area.description}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-background/70 p-2.5">
        <CompassIcon
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 text-primary"
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          No celular, todas essas áreas abrem no botão Explorar.
        </p>
      </div>
    </div>
  );
}

function SchedulesChapter() {
  return (
    <div className="space-y-2.5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Na Home, sua próxima escala aparece logo no topo. Abra o encontro para
        confirmar presença e ver horário, local e a função que você vai servir.
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Em Disponibilidade, marque os dias em que você pode servir — assim os
        líderes escalam você com tranquilidade. Os avisos da igreja chegam em
        Notificações e também pelo WhatsApp.
      </p>

      <Link
        href="/schedules"
        className="inline-flex min-h-9 items-center gap-1 rounded-md text-[11px] font-medium text-primary underline-offset-4 transition-colors hover:underline motion-reduce:transition-none"
      >
        Ver minhas escalas
        <ArrowRightIcon aria-hidden="true" className="size-3" />
      </Link>
    </div>
  );
}

function ProfileChapter({
  initialPhone,
  initialBirthday,
  isMobile,
}: {
  initialPhone?: string | null;
  initialBirthday?: string | null;
  isMobile: boolean;
}) {
  const hasProfileInfo = Boolean(initialPhone && initialBirthday);

  return (
    <div className="space-y-2.5">
      <Link
        href="/settings?scope=account&tab=profile"
        className="flex items-start gap-2.5 rounded-lg border border-border bg-background/70 p-2.5 transition-colors hover:bg-muted/40 motion-reduce:transition-none"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UsersIcon aria-hidden="true" className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[11px] font-semibold text-foreground">
              WhatsApp e aniversário no Perfil
            </span>
            {hasProfileInfo ? (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[11px] font-medium text-primary"
              >
                Preenchido
              </Badge>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
            Complete quando preferir — os lembretes de escala e o mural de
            aniversários usam esses dados.
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            Abrir Perfil
            <ArrowRightIcon aria-hidden="true" className="size-3" />
          </span>
        </span>
      </Link>

      <PwaShortcut isMobile={isMobile} />
    </div>
  );
}

function PwaShortcut({ isMobile }: { isMobile: boolean }) {
  const { platform, isStandalone, canInstallNatively, triggerNativeInstall } =
    usePwaInstall();

  return (
    <div className="rounded-lg border border-border bg-background/70 p-2.5">
      <div className="flex items-start gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SmartphoneIcon aria-hidden="true" className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-foreground">
            Adicionar à tela inicial no celular
          </p>

          {isStandalone ? (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <CheckIcon aria-hidden="true" className="size-3 text-primary" />
              Aplicativo já instalado
            </p>
          ) : canInstallNatively ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void triggerNativeInstall();
              }}
              className="mt-1.5 min-h-11 w-full gap-1.5 text-[11px] md:min-h-8"
            >
              <DownloadIcon aria-hidden="true" className="size-3.5" />
              Instalar aplicativo
            </Button>
          ) : platform === "ios" ? (
            <ol className="mt-1 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-1">
                <span className="font-semibold text-foreground">1.</span>
                <span>
                  Toque em Compartilhar{" "}
                  <ShareIcon
                    aria-hidden="true"
                    className="inline size-3 text-primary"
                  />
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="font-semibold text-foreground">2.</span>
                <span>Escolha &ldquo;Adicionar à Tela de Início&rdquo;.</span>
              </li>
            </ol>
          ) : (
            <Link
              href="/settings?scope=account&tab=app"
              className="mt-1 inline-flex min-h-9 items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 transition-colors hover:underline motion-reduce:transition-none"
            >
              Ver como instalar
              <ArrowRightIcon aria-hidden="true" className="size-3" />
            </Link>
          )}

          {isMobile && !isStandalone ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Sem pressa: o app continua funcionando normalmente no navegador.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

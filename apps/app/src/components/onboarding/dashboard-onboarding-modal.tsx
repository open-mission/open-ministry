"use client";

import * as React from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  DownloadIcon,
  FileMusicIcon,
  Loader2Icon,
  MessageCircleIcon,
  ShareIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  completeOnboardingTourAction,
  saveOnboardingProfileInfoAction,
} from "@/app/actions/onboarding-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePwaInstall } from "@/components/pwa/use-pwa-install";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
} from "@/lib/whatsapp-prompt";
import { telemetryMetrics } from "@/lib/telemetry/sentry";

interface DashboardOnboardingModalProps {
  userName: string;
  initialPhone?: string | null;
  initialBirthday?: string | null;
  initialTourCompleted: boolean;
}

function formatBrazilianDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToBRDate(iso?: string | null): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return iso;
}

export function DashboardOnboardingModal({
  userName,
  initialPhone,
  initialBirthday,
  initialTourCompleted,
}: DashboardOnboardingModalProps) {
  const [isOpen, setIsOpen] = React.useState(!initialTourCompleted);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [phone, setPhone] = React.useState(initialPhone || "");
  const [birthday, setBirthday] = React.useState(isoToBRDate(initialBirthday));
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [birthdayError, setBirthdayError] = React.useState<string | null>(null);
  const [isSaving, startTransition] = React.useTransition();

  const {
    platform,
    isStandalone,
    canInstallNatively,
    triggerNativeInstall,
  } = usePwaInstall();

  // Listen to custom event to reopen tour from settings/menu anytime
  React.useEffect(() => {
    function handleOpenEvent() {
      setCurrentStep(0);
      setIsOpen(true);
      telemetryMetrics.count("onboarding.tour.reopened", 1);
    }

    window.addEventListener("open-onboarding-tour", handleOpenEvent);
    return () => {
      window.removeEventListener("open-onboarding-tour", handleOpenEvent);
    };
  }, []);

  const totalSteps = 6;
  const progressPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  const hasPhone = !!phone && isValidBrazilianPhone(phone);
  const hasBirthday = !!birthday && /^\d{2}\/\d{2}\/\d{4}$/.test(birthday);

  async function handleCloseOrDismiss() {
    setIsOpen(false);
    try {
      await completeOnboardingTourAction();
    } catch {
      // Ignore background completion failure
    }
  }

  function handleNextStep() {
    // If on profile info step, validate
    if (currentStep === 4) {
      let hasError = false;
      if (phone && !isValidBrazilianPhone(phone)) {
        setPhoneError("Número inválido. Use (99) 99999-9999 com DDD.");
        hasError = true;
      }
      if (birthday && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
        setBirthdayError("Data inválida. Use DD/MM/AAAA.");
        hasError = true;
      }

      if (hasError) return;

      // Save fields if entered
      if ((phone && phone !== initialPhone) || (birthday && birthday !== isoToBRDate(initialBirthday))) {
        startTransition(async () => {
          const res = await saveOnboardingProfileInfoAction({
            phone: phone || undefined,
            birthday: birthday || undefined,
          });

          if (!res.ok) {
            toast.error(res.error);
            return;
          }

          toast.success("Informações salvas com sucesso!");
          setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
        });
        return;
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      telemetryMetrics.count("onboarding.step_viewed", 1, { step: String(currentStep + 1) });
    } else {
      handleCloseOrDismiss();
      toast.success("Tour concluído! Aproveite o OpenMinistry.");
    }
  }

  function handlePrevStep() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop for Desktop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={handleCloseOrDismiss}
      />

      {/* Main Container: Fullpage on Mobile (< md), Wide Modal on Desktop (>= md) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 pointer-events-none">
        <div className="pointer-events-auto h-[100dvh] w-full max-w-none md:h-auto md:max-h-[88vh] md:max-w-4xl rounded-none md:rounded-2xl border-0 md:border md:border-border/80 bg-background md:bg-card shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Top Bar: Progress & Close */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-serif font-bold text-xs shadow-xs">
                ✝
              </div>
              <span className="font-serif text-sm font-bold tracking-tight text-foreground">
                OpenMinistry
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium text-muted-foreground ml-2">
                • Guia Rápido da Plataforma
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-muted-foreground">
                Passo {currentStep + 1} de {totalSteps}
              </div>
              <button
                type="button"
                onClick={handleCloseOrDismiss}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Pular e fechar introdução"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="h-1 w-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Step Content: Responsive 2-column on desktop, stacked on mobile */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-4 w-fit">
                    <SparklesIcon className="h-3.5 w-3.5" />
                    <span>Boas-vindas, {userName}!</span>
                  </div>
                  <h2
                    id="onboarding-step-title"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug"
                  >
                    Sua igreja e seu ministério organizados em perfeita harmonia.
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    O OpenMinistry foi desenvolvido para que líderes, voluntários e pastores sirvam com excelência. Em poucos passos, vamos apresentar os recursos mais importantes para o seu dia a dia.
                  </p>

                  <div className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Escalas inteligentes com controle de disponibilidade</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Notificações e confirmação de presença no WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Repertório musical com cifras e transposição de tom</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>App no seu celular para acesso rápido</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-muted/40 p-5 flex flex-col justify-center items-center text-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-serif text-3xl mb-4 shadow-inner">
                    ✝
                  </div>
                  <h3 className="font-semibold text-foreground text-base">
                    Comunidade Viva
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1.5">
                    Tudo integrado para que você passe menos tempo em planilhas e mais tempo cuidando de vidas.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                    <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <UsersIcon className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-foreground">Equipes</p>
                      <p className="text-[10px] text-muted-foreground">Sem sobrecarga</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-3 text-center">
                      <CalendarCheckIcon className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-foreground">Cultos</p>
                      <p className="text-[10px] text-muted-foreground">Escalas pontuais</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Scales & Volunteers */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4 w-fit">
                    <CalendarCheckIcon className="h-3.5 w-3.5" />
                    <span>Módulo de Escalas</span>
                  </div>
                  <h2
                    id="onboarding-step-title"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug"
                  >
                    Escalas sem atritos e sem conflitos de data.
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Controle de disponibilidade de voluntários, avisos de ausência e histórico de participações para garantir que ninguém fique sobrecarregado.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-lg bg-muted/40 p-3 text-xs border border-border/60">
                      <p className="font-semibold text-foreground">Disponibilidade em Tempo Real</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Voluntários marcam dias disponíveis com antecedência, facilitando o planejamento mensal.
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-xs border border-border/60">
                      <p className="font-semibold text-foreground">Distribuição Justa</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Alertas visuais quando um voluntário for escalado em múltiplos cultos próximos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mock Scale UI */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Culto de Domingo • 19:00</p>
                      <p className="text-[10px] text-muted-foreground">Ministério de Louvor & Recepção</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40">
                      Equipe Pronta
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          M
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Mateus Ribeiro</p>
                          <p className="text-[10px] text-muted-foreground">Bateria</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckIcon className="h-3 w-3" /> Confirmado
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                          L
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Larissa Costa</p>
                          <p className="text-[10px] text-muted-foreground">Vocal Contralto</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckIcon className="h-3 w-3" /> Confirmado
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: WhatsApp & Notifications */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4 w-fit">
                    <MessageCircleIcon className="h-3.5 w-3.5" />
                    <span>WhatsApp Multi-canal</span>
                  </div>
                  <h2
                    id="onboarding-step-title"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug"
                  >
                    Confirmação de presença direto no WhatsApp.
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Seus voluntários não precisam abrir planilhas ou lembrar senhas para confirmar presença. A notificação chega diretamente no WhatsApp deles.
                  </p>

                  <div className="mt-6 space-y-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Confirmação em 1 toque sem fricção</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Lembrete automático 24 horas antes do evento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Status da escala atualizado automaticamente</span>
                    </div>
                  </div>
                </div>

                {/* Mock WhatsApp Chat Bubble */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <MessageCircleIcon className="h-4 w-4" />
                    <span>Mensagem Automática OpenMinistry</span>
                  </div>
                  <div className="rounded-xl bg-card p-4 border border-border/80 shadow-sm space-y-2 text-xs text-foreground">
                    <p className="font-semibold text-primary">
                      Olá, voluntário(a)! 🕊️
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      Você foi escalado para o <strong>Culto da Família</strong> neste Domingo às 19h na função <strong>Teclado</strong>.
                    </p>
                    <div className="pt-2">
                      <div className="rounded-lg bg-emerald-600 text-white text-center py-2 text-xs font-semibold shadow-xs">
                        ✓ Confirmar Presença no WhatsApp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Songs & Repertoire */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-4 w-fit">
                    <FileMusicIcon className="h-3.5 w-3.5" />
                    <span>Músicas & Cifras</span>
                  </div>
                  <h2
                    id="onboarding-step-title"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug"
                  >
                    Repertório musical, cifras e tom em sintonia.
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Organize o repertório dos cultos com tom original, transposição instantânea, cifras e links diretos para YouTube e Spotify para que toda a banda ensaie a mesma versão.
                  </p>

                  <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Transposição de tom em tempo real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Tags por temática (Adoração, Louvor, Ceia)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Bíblia digital integrada para planejamento litúrgico</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Graça Infalível</p>
                      <p className="text-[11px] text-muted-foreground">Adoração • BPM 72</p>
                    </div>
                    <span className="font-mono text-xs font-bold rounded-md bg-primary/10 text-primary px-2 py-1">
                      Tom: G
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 font-mono text-[11px] text-muted-foreground leading-relaxed">
                    <p className="text-primary font-bold">G        C9          Em7   D</p>
                    <p className="text-foreground">Tua graça me alcançou, Senhor...</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] rounded bg-red-500/10 text-red-600 px-2 py-0.5 font-medium">
                      YouTube Vídeo
                    </span>
                    <span className="text-[10px] rounded bg-emerald-500/10 text-emerald-600 px-2 py-0.5 font-medium">
                      Spotify Faixa
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Missing Profile Info (WhatsApp & Birthday) */}
            {currentStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 mb-4 w-fit">
                    <UsersIcon className="h-3.5 w-3.5" />
                    <span>Dados do Perfil</span>
                  </div>
                  <h2
                    id="onboarding-step-title"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug"
                  >
                    Complete suas informações ministeriais.
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Precisamos desses dados para conectar você aos avisos no WhatsApp da sua igreja e comemorar seu aniversário no calendário comunitário.
                  </p>

                  <div className="mt-5 space-y-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                      <ShieldCheckIcon className="h-4 w-4" />
                      Seus dados ficam protegidos e visíveis apenas para a liderança.
                    </p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                  {/* WhatsApp Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageCircleIcon className="h-4 w-4 text-emerald-600" />
                        Número de WhatsApp
                      </span>
                      {hasPhone && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckIcon className="h-3 w-3" /> Preenchido
                        </span>
                      )}
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(formatBrazilianPhone(e.target.value));
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="(11) 99999-9999"
                      className="font-mono"
                    />
                    {phoneError && (
                      <p className="text-[11px] text-destructive">{phoneError}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Necessário com DDD para receber confirmações de escalas.
                    </p>
                  </div>

                  {/* Birthday */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-teal-600" />
                        Data de Nascimento
                      </span>
                      {hasBirthday && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckIcon className="h-3 w-3" /> Preenchido
                        </span>
                      )}
                    </label>
                    <Input
                      type="text"
                      value={birthday}
                      onChange={(e) => {
                        setBirthday(formatBrazilianDate(e.target.value));
                        if (birthdayError) setBirthdayError(null);
                      }}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className="font-mono"
                    />
                    {birthdayError && (
                      <p className="text-[11px] text-destructive">{birthdayError}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Utilizada para o módulo de aniversariantes da igreja.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Install PWA / Mobile */}
            {currentStep === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 mb-4 w-fit">
                    <SmartphoneIcon className="h-3.5 w-3.5" />
                    <span>Aplicativo no Celular</span>
                  </div>
                  <h2
                    id="onboarding-step-title"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug"
                  >
                    Instale o OpenMinistry na sua tela de início.
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Tenha acesso instantâneo em 1 toque, carregamento ultra-rápido e modo offline sem precisar baixar em lojas de aplicativos.
                  </p>

                  <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Sem ocupar espaço desnecessário de memória</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Notificações push em tempo real</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Funciona offline para consultar suas escalas</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center justify-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-serif text-2xl flex items-center justify-center mb-4 shadow-md">
                    ✝
                  </div>

                  {isStandalone ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1.5">
                        <CheckCircle2Icon className="h-4 w-4" />
                        App Instalado com Sucesso!
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Você já está utilizando o OpenMinistry como aplicativo nativo.
                      </p>
                    </div>
                  ) : platform === "ios" ? (
                    <div className="space-y-3 text-left w-full">
                      <p className="text-xs font-bold text-foreground text-center">
                        Como instalar no iPhone ou iPad:
                      </p>
                      <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/60">
                        <p className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px]">1</span>
                          <span>Toque no botão de <strong>Compartilhar</strong> do Safari</span>
                          <ShareIcon className="h-3.5 w-3.5 text-primary ml-auto" />
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px]">2</span>
                          <span>Role e selecione <strong>Adicionar à Tela de Início</strong></span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px]">3</span>
                          <span>Toque em <strong>Adicionar</strong> no topo direito</span>
                        </p>
                      </div>
                    </div>
                  ) : canInstallNatively ? (
                    <div className="space-y-3 w-full">
                      <p className="text-xs text-muted-foreground">
                        Clique abaixo para instalar o app direto no seu dispositivo:
                      </p>
                      <Button
                        type="button"
                        onClick={() => triggerNativeInstall()}
                        className="w-full gap-2 rounded-xl py-3 font-semibold"
                      >
                        <DownloadIcon className="h-4 w-4" />
                        Instalar Aplicativo Agora
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Disponível em qualquer dispositivo
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Adicione este endereço aos favoritos ou instale pelo menu do navegador para ter acesso em tela cheia.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 sm:px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevStep}
              disabled={currentStep === 0 || isSaving}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < totalSteps - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseOrDismiss}
                  className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                >
                  Pular introdução
                </Button>
              )}

              <Button
                type="button"
                onClick={handleNextStep}
                disabled={isSaving}
                className="gap-1.5 text-xs font-semibold px-5 rounded-xl shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : currentStep === totalSteps - 1 ? (
                  <>
                    Concluir e Começar
                    <CheckIcon className="h-3.5 w-3.5" />
                  </>
                ) : currentStep === 4 ? (
                  <>
                    Salvar e Continuar
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

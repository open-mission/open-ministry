"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  DownloadIcon,
  FileMusicIcon,
  FlameIcon,
  Loader2Icon,
  MessageCircleIcon,
  MusicIcon,
  PhoneIcon,
  ShareIcon,
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

  // Interactive sandbox states to wow the user
  const [simulatedConfirmed, setSimulatedConfirmed] = React.useState(false);
  const [currentKey, setCurrentKey] = React.useState<"G" | "A" | "D">("G");
  const [volunteerStatus, setVolunteerStatus] = React.useState<"confirmado" | "disponivel">("confirmado");

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

  // Calculate live completeness score
  const completeness = (hasPhone ? 50 : 0) + (hasBirthday ? 50 : 0);

  async function handleCloseOrDismiss() {
    setIsOpen(false);
    try {
      await completeOnboardingTourAction();
    } catch {
      // Ignore background completion failure
    }
  }

  function handleNextStep() {
    // If on profile info step (Step 4), validate and save
    if (currentStep === 4) {
      let hasError = false;
      if (phone && !isValidBrazilianPhone(phone)) {
        setPhoneError("Número inválido. Use formato (99) 99999-9999 com DDD.");
        hasError = true;
      }
      if (birthday && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
        setBirthdayError("Data inválida. Use o formato DD/MM/AAAA.");
        hasError = true;
      }

      if (hasError) return;

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

          toast.success("Perfil ministerial atualizado com sucesso!");
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
      toast.success("Experiência concluída! Seja bem-vindo ao OpenMinistry.");
    }
  }

  function handlePrevStep() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  // Keyboard navigation for power users
  React.useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleCloseOrDismiss();
      } else if (e.key === "ArrowRight" && e.metaKey) {
        handleNextStep();
      } else if (e.key === "ArrowLeft" && e.metaKey) {
        handlePrevStep();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      {/* Immersive backdrop with ambient colored lighting */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xl animate-in fade-in-0 duration-300"
        onClick={handleCloseOrDismiss}
      />

      {/* Main Container: Fullpage Screen on Mobile (< md), Wide Canvas on Desktop (>= md) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 lg:p-8 pointer-events-none">
        <div className="pointer-events-auto h-[100dvh] w-full max-w-none md:h-[660px] md:max-w-5xl rounded-none md:rounded-3xl border-0 md:border md:border-white/10 bg-background md:bg-card/95 text-foreground shadow-[0_25px_70px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-250 backdrop-blur-2xl">
          
          {/* Header Bar */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-5 sm:px-7 pt-[env(safe-area-inset-top)] md:pt-0 bg-card/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-serif font-bold text-sm shadow-sm ring-1 ring-white/20">
                ✝
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-sm font-bold tracking-tight text-foreground">
                  OpenMinistry
                </span>
                <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                  Introdução Interativa
                </span>
              </div>
            </div>

            {/* Stepper Dots & Close */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    aria-label={`Ir para o passo ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? "w-7 bg-primary shadow-xs"
                        : idx < currentStep
                        ? "w-2 bg-primary/40 hover:bg-primary/60"
                        : "w-2 bg-muted hover:bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div className="h-4 w-px bg-border/60" />

              <button
                type="button"
                onClick={handleCloseOrDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                aria-label="Pular e fechar introdução"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="h-0.5 w-full bg-border/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Body Content: Split-Screen Canvas on Desktop, Vertical Flow on Mobile */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
            
            {/* Left Column: Visual Showcase (Hidden or Banner on Mobile, Full Column on Desktop) */}
            <div className="relative md:col-span-6 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-background border-b md:border-b-0 md:border-r border-border/40 p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
              {/* Subtle ambient lighting bloom */}
              <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

              {/* Step Dynamic Visual */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center py-4">
                {/* Visual 0: Sanctuary / Welcome */}
                {currentStep === 0 && (
                  <div className="space-y-4 w-full max-w-sm">
                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/20">
                      <Image
                        src="/onboarding/hero.jpg"
                        alt="OpenMinistry Sanctuary"
                        fill
                        priority
                        className="object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                        <div className="text-left text-white">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                            Comunidade & Liderança
                          </p>
                          <p className="text-xs font-medium text-white/90">
                            Excelência no serviço à igreja local
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual 1: Volunteer Scheduling & Board */}
                {currentStep === 1 && (
                  <div className="space-y-4 w-full max-w-sm">
                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                      <Image
                        src="/onboarding/scheduling.jpg"
                        alt="Escalas e Voluntários"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-4">
                        <div className="w-full text-left">
                          <div className="flex items-center justify-between text-xs text-white mb-2">
                            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                              <CalendarCheckIcon className="h-3.5 w-3.5" /> Domingo • Culto 19h
                            </span>
                            <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                              Sem Conflitos
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setVolunteerStatus(volunteerStatus === "confirmado" ? "disponivel" : "confirmado")}
                              className="rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md px-2.5 py-1 text-[11px] text-white flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle2Icon className="h-3 w-3 text-emerald-400" />
                              Toque para alternar status: <strong>{volunteerStatus}</strong>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual 2: WhatsApp Live Notification Simulator */}
                {currentStep === 2 && (
                  <div className="w-full max-w-sm space-y-3 text-left">
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageCircleIcon className="h-3.5 w-3.5" /> Simulador ao Vivo
                    </p>
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/70 p-4 shadow-xl backdrop-blur-md space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          OM
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">OpenMinistry WhatsApp</p>
                          <p className="text-[10px] text-emerald-300">Mensagem Instantânea</p>
                        </div>
                        <span className="ml-auto text-[10px] text-emerald-400/80">agora</span>
                      </div>

                      <div className="rounded-xl bg-card/90 p-3.5 text-xs text-foreground border border-border/60 shadow-sm space-y-2">
                        <p className="font-semibold text-primary">
                          Paz do Senhor, {userName.split(" ")[0]}! 🕊️
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-[11px]">
                          Você foi escalado para o <strong>Culto de Domingo às 19:00</strong>. Clique abaixo para confirmar:
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSimulatedConfirmed(!simulatedConfirmed);
                              if (!simulatedConfirmed) {
                                toast.success("Presença confirmada no WhatsApp!");
                              }
                            }}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                              simulatedConfirmed
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            {simulatedConfirmed ? "✓ Presença Confirmada!" : "Toque para Confirmar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual 3: Praise & Worship Repertoire */}
                {currentStep === 3 && (
                  <div className="space-y-4 w-full max-w-sm">
                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                      <Image
                        src="/onboarding/worship.jpg"
                        alt="Repertório e Músicas"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-4">
                        <div className="w-full text-left">
                          <div className="flex items-center justify-between text-xs text-white mb-2">
                            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                              <MusicIcon className="h-3.5 w-3.5" /> Graça Infalível
                            </span>
                            <div className="flex items-center gap-1">
                              {(["G", "A", "D"] as const).map((tone) => (
                                <button
                                  key={tone}
                                  type="button"
                                  onClick={() => setCurrentKey(tone)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                                    currentKey === tone
                                      ? "bg-amber-400 text-black shadow-xs"
                                      : "bg-white/20 text-white hover:bg-white/30"
                                  }`}
                                >
                                  {tone}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className="font-mono text-[11px] text-white/80 bg-black/40 rounded px-2 py-1 backdrop-blur-xs">
                            Tom ativo: <strong>{currentKey}</strong> • Cifra e arranjo transpostos
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual 4: Profile Completeness Score */}
                {currentStep === 4 && (
                  <div className="space-y-4 w-full max-w-xs text-center">
                    <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-emerald-500/30 bg-emerald-950/60 shadow-xl">
                      <div
                        className="absolute inset-0 rounded-full border-4 border-emerald-400 transition-all duration-700"
                        style={{
                          clipPath: `polygon(50% 50%, -50% -50%, ${completeness * 2}% 0%, 100% 100%, 0% 100%)`,
                        }}
                      />
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold font-serif text-white">
                          {completeness}%
                        </span>
                        <span className="text-[10px] text-emerald-300 font-medium uppercase tracking-wider">
                          Completo
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 text-white">
                      <p className="text-sm font-semibold">Perfil Ministerial</p>
                      <p className="text-xs text-white/70">
                        {completeness === 100
                          ? "Tudo pronto! Seus líderes já podem escalar você."
                          : "Preencha seus dados para receber notificações."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual 5: Mobile App PWA Preview */}
                {currentStep === 5 && (
                  <div className="space-y-4 w-full max-w-xs text-center">
                    <div className="relative mx-auto flex h-32 w-24 items-center justify-center rounded-2xl border-2 border-white/20 bg-emerald-950/80 shadow-2xl p-2 flex-col">
                      <div className="h-1 w-6 rounded-full bg-white/30 mb-auto" />
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-serif font-bold text-lg flex items-center justify-center shadow-lg my-auto">
                        ✝
                      </div>
                      <p className="text-[9px] font-semibold text-white/80 mt-auto">OpenMinistry</p>
                    </div>
                    <p className="text-xs text-white/90 font-medium">
                      {isStandalone ? "Aplicativo Ativo no seu Dispositivo" : "Instale e use em Tela Cheia"}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom tag inside left column */}
              <div className="relative z-10 pt-2 text-[11px] text-white/60 flex items-center justify-between border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <SparklesIcon className="h-3 w-3 text-emerald-400" />
                  Experiência Ministerial Impeccable
                </span>
                <span>Passo {currentStep + 1} de {totalSteps}</span>
              </div>
            </div>

            {/* Right Column: Interactive Content & Controls */}
            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-5">
                
                {/* Step 0: Welcome Content */}
                {currentStep === 0 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 gap-1.5">
                      <SparklesIcon className="h-3.5 w-3.5 text-emerald-600" />
                      Bem-vindo, {userName}!
                    </Badge>
                    <h2 id="onboarding-modal-title" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                      A nova era da gestão da sua igreja.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      O OpenMinistry foi desenhado com paixão para pastores, líderes, voluntários e equipes ministeriais. Em menos de 2 minutos você conhecerá tudo o que precisa para servir com leveza.
                    </p>

                    <div className="space-y-2.5 pt-2 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Escalas Inteligentes</p>
                          <p className="text-[11px]">Controle de disponibilidade automática e histórico de escalas.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">WhatsApp Instantâneo</p>
                          <p className="text-[11px]">Confirmação de presença em 1 toque sem atrito.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Repertório Musical Vivo</p>
                          <p className="text-[11px]">Cifras, tom e links para ensaio no YouTube e Spotify.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Scales & Volunteers */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary gap-1.5">
                      <CalendarCheckIcon className="h-3.5 w-3.5" />
                      Módulo de Escalas
                    </Badge>
                    <h2 id="onboarding-modal-title" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                      Escalas sem estresse, sem sobrecarga.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Líderes sabem antecipadamente quem pode servir. O sistema cruza disponibilidades e impede conflitos de datas entre equipes.
                    </p>

                    <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2 text-xs">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <FlameIcon className="h-4 w-4 text-amber-500" />
                        Equilíbrio de Voluntários
                      </p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Ninguém fica esgotado por servir em cultos seguidos. O histórico garante rodízio saudável para toda a comunidade.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: WhatsApp Notifications */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1.5">
                      <MessageCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                      WhatsApp Multi-canal
                    </Badge>
                    <h2 id="onboarding-modal-title" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                      Confirmação instantânea na palma da mão.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Nenhum voluntário precisa baixar apps pesados para confirmar presença. A notificação chega personalizada no WhatsApp com link seguro.
                    </p>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Disparos automáticos e avisos 24 horas antes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Taxa de confirmação 4x maior do que por email</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Painel do líder atualizado em tempo real</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Songs & Repertoire */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1.5">
                      <FileMusicIcon className="h-3.5 w-3.5 text-amber-600" />
                      Repertório de Louvor
                    </Badge>
                    <h2 id="onboarding-modal-title" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                      Músicas, cifras e tom em total harmonia.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A equipe de louvor ensaia a mesma versão. Cifras dinâmicas que transpoem o tom com 1 clique, integradas à Bíblia digital e ao cronograma do culto.
                    </p>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Transposição cromática instantânea</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Links de referência para YouTube e Spotify</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Exportação em PDF limpa para os músicos</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Missing Profile Info (WhatsApp & Birthday) */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <Badge variant="outline" className="border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300 gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5 text-teal-600" />
                      Informações de Perfil
                    </Badge>
                    <h2 id="onboarding-modal-title" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                      Complete seu cadastro ministerial.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Para conectar você aos avisos no WhatsApp e celebrar seu aniversário com a igreja, informe os campos abaixo:
                    </p>

                    <div className="space-y-4 pt-1">
                      {/* WhatsApp Phone Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <PhoneIcon className="h-3.5 w-3.5 text-emerald-600" />
                            WhatsApp
                          </span>
                          {hasPhone ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckIcon className="h-3 w-3" /> Preenchido
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-medium">Obrigatório com DDD</span>
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
                          className="font-mono h-11 rounded-xl text-sm"
                        />
                        {phoneError && (
                          <p className="text-[11px] text-destructive">{phoneError}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Utilizado para envio de lembretes e confirmações de escala.
                        </p>
                      </div>

                      {/* Birthday Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5 text-teal-600" />
                            Data de Nascimento
                          </span>
                          {hasBirthday ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckIcon className="h-3 w-3" /> Preenchido
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Dia / Mês / Ano</span>
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
                          className="font-mono h-11 rounded-xl text-sm"
                        />
                        {birthdayError && (
                          <p className="text-[11px] text-destructive">{birthdayError}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Para celebrarmos seu aniversário no mural da igreja.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Install PWA on Mobile / Desktop */}
                {currentStep === 5 && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300 gap-1.5">
                      <SmartphoneIcon className="h-3.5 w-3.5 text-purple-600" />
                      App no Celular (PWA)
                    </Badge>
                    <h2 id="onboarding-modal-title" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                      Tenha o OpenMinistry sempre à mão.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Instale na tela de início do seu celular. É leve, rápido, não ocupa memória e funciona mesmo sem sinal de internet.
                    </p>

                    <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-3">
                      {isStandalone ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                          <CheckCircle2Icon className="h-4 w-4" />
                          <span>Aplicativo já está instalado no seu dispositivo!</span>
                        </div>
                      ) : platform === "ios" ? (
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p className="font-semibold text-foreground">Como adicionar no Safari (iOS):</p>
                          <p className="flex items-center gap-1.5">
                            1. Toque em Compartilhar <ShareIcon className="h-3.5 w-3.5 inline text-primary" />
                          </p>
                          <p>2. Selecione <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong></p>
                          <p>3. Toque em <strong>&ldquo;Adicionar&rdquo;</strong></p>
                        </div>
                      ) : canInstallNatively ? (
                        <Button
                          type="button"
                          onClick={() => triggerNativeInstall()}
                          className="w-full gap-2 py-3 font-semibold rounded-xl"
                        >
                          <DownloadIcon className="h-4 w-4" />
                          Instalar Aplicativo Agora
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Adicione aos favoritos ou atalho para ter acesso instantâneo em tela cheia.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-6">
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
                    className="gap-1.5 text-xs font-semibold px-6 py-2.5 rounded-xl shadow-md bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white active:scale-[0.98] transition-all"
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
                        Avançar
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

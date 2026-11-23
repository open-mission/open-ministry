"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { completeOnboardingTourAction } from "@/app/actions/onboarding-tour";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMounted } from "@/hooks/use-mounted";
import { useStableIsMobile } from "@/hooks/use-stable-is-mobile";
import { telemetryMetrics } from "@/lib/telemetry/sentry";
import {
  WELCOME_GUIDE_CHAPTERS,
  WelcomeGuideContent,
} from "./welcome-guide-content";

export { ProfileCompletenessRing } from "./profile-completeness-ring";

interface DashboardOnboardingModalProps {
  userName: string;
  initialPhone?: string | null;
  initialBirthday?: string | null;
  initialTourCompleted: boolean;
}

/**
 * Guia de boas-vindas em 3 capítulos.
 *
 * Desktop: painel lateral direito não modal, para que a Home continue visível e
 * clicável. Mobile: bottom-sheet (Drawer) com o mesmo conteúdo.
 */
export function DashboardOnboardingModal({
  initialPhone,
  initialBirthday,
  initialTourCompleted,
}: DashboardOnboardingModalProps) {
  const [isOpen, setIsOpen] = React.useState(!initialTourCompleted);
  const [activeChapter, setActiveChapter] = React.useState(0);
  const mounted = useMounted();
  const isMobile = useStableIsMobile(isOpen && mounted);

  const finishGuide = React.useCallback(() => {
    setIsOpen(false);
    void completeOnboardingTourAction().catch(() => undefined);
  }, []);

  const selectChapter = React.useCallback((index: number) => {
    setActiveChapter(index);
    telemetryMetrics.count("onboarding.step_viewed", 1, {
      step: String(index + 1),
    });
  }, []);

  const goToNextChapter = React.useCallback(() => {
    if (activeChapter >= WELCOME_GUIDE_CHAPTERS.length - 1) {
      finishGuide();
      return;
    }

    selectChapter(activeChapter + 1);
  }, [activeChapter, finishGuide, selectChapter]);

  React.useEffect(() => {
    function handleOpenEvent() {
      setActiveChapter(0);
      setIsOpen(true);
      telemetryMetrics.count("onboarding.tour.reopened", 1);
    }

    window.addEventListener("open-onboarding-tour", handleOpenEvent);
    return () => {
      window.removeEventListener("open-onboarding-tour", handleOpenEvent);
    };
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) finishGuide();
    },
    [finishGuide],
  );

  // Evita trocar Sheet por Drawer durante a hidratação (o HTML do servidor não
  // conhece o breakpoint) e congela o modo enquanto o guia está aberto.
  if (!mounted) return null;

  const content = (
    <WelcomeGuideContent
      activeChapter={activeChapter}
      onSelectChapter={selectChapter}
      onSkip={finishGuide}
      onNext={goToNextChapter}
      isMobile={isMobile}
      initialPhone={initialPhone}
      initialBirthday={initialBirthday}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[85dvh] gap-0 rounded-t-xl bg-popover">
          <DrawerHeader className="!text-left gap-1 border-b border-border px-4 pt-1 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                  BOAS-VINDAS · 3 CAPÍTULOS
                </p>
                <DrawerTitle className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Guia da plataforma
                </DrawerTitle>
                <DrawerDescription className="text-xs leading-relaxed text-muted-foreground">
                  Explore sem pressa — a Home continua livre para você tocar.
                </DrawerDescription>
              </div>

              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Fechar guia de boas-vindas"
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <SheetContent
        side="right"
        showCloseButton={false}
        showOverlay={false}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="gap-0 border-border border-l bg-card p-0 text-foreground sm:max-w-sm"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 pt-4 pb-3 md:px-5">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
              BOAS-VINDAS · 3 CAPÍTULOS
            </p>
            <SheetTitle asChild>
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                Guia da plataforma
              </h2>
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
              Explore sem pressa — o aplicativo ao lado continua livre para você
              clicar.
            </SheetDescription>
          </div>

          <button
            type="button"
            onClick={finishGuide}
            aria-label="Fechar guia de boas-vindas"
            className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </div>

        {content}
      </SheetContent>
    </Sheet>
  );
}

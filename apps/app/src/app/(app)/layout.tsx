import { Suspense } from "react";

import { AppSidebarLoader } from "@/components/app/app-sidebar-loader";
import { DashboardBreadcrumb } from "@/components/app/dashboard-breadcrumb";
import {
  CalendarHiddenSlot,
  HeaderCenterSlot,
  HeaderUserSlot,
  HomeAwareHeader,
  HomeAwareHeaderFallback,
} from "@/components/app/home-header-slot";
import { DashboardOnboardingLoader } from "@/components/onboarding/dashboard-onboarding-loader";
import { SentryUserLoader } from "@/components/app/sentry-user-loader";
import { ImpersonationBannerLoader } from "@/components/app/impersonation-banner-loader";
import {
  MobileHeaderLeadingFallback,
  MobileHeaderLeadingLoader,
} from "@/components/app/mobile-header-leading-loader";
import { ModalInteractivityGuard } from "@/components/app/modal-interactivity-guard";
import { MobileMenuLoader } from "@/components/app/mobile-menu-loader";
import { MobileMenuProvider } from "@/components/app/mobile-menu";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";
import { MobileNavLoader } from "@/components/app/mobile-nav-loader";
import { MobileNavShell } from "@/components/app/mobile-nav-shell";
import { NotificationBarLoader } from "@/components/app/notification-bar-loader";
import { NotificationBellFallback, NotificationBellLoader } from "@/components/app/notification-bell-loader";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { OpenMinistryRealtimeProvider } from "@/lib/realtime/client";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { PwaInstallTracker } from "@/components/pwa/pwa-install-tracker";
import { PwaNotificationPrompt } from "@/components/pwa/pwa-notification-prompt";
import { ReleaseNotesModal } from "@/components/release-notes/release-notes-modal";
import { WhatsAppPromptLoader } from "@/components/app/whatsapp-prompt-loader";
import {
  UserMenuFallback,
  UserMenuLoader,
} from "@/components/app/user-menu-loader";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerContent = (
    <>
      <CalendarHiddenSlot>
        <SidebarTrigger className="pointer-events-auto hidden lg:inline-flex" />
        <Suspense fallback={<MobileHeaderLeadingFallback />}>
          <MobileHeaderLeadingLoader />
        </Suspense>
        <Suspense fallback={null}>
          <HeaderCenterSlot>
            <DashboardBreadcrumb />
          </HeaderCenterSlot>
        </Suspense>
      </CalendarHiddenSlot>
      <div className="pointer-events-auto ml-auto flex items-center gap-1.5 sm:gap-2">
        <Suspense fallback={<NotificationBellFallback />}>
          <NotificationBellLoader />
        </Suspense>
        <Suspense fallback={null}>
          <HeaderUserSlot>
            <Suspense fallback={<UserMenuFallback />}>
              <UserMenuLoader />
            </Suspense>
          </HeaderUserSlot>
        </Suspense>
      </div>
    </>
  );

  return (
    <OpenMinistryRealtimeProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties}
      >
        <MobileMenuProvider>
          <SettingsModalProvider>
            <Suspense fallback={<SidebarSkeleton />}>
              <AppSidebarLoader />
            </Suspense>
            <SidebarInset className="group/sidebar-inset min-w-0 has-data-calendar-active:h-dvh has-data-calendar-active:overflow-hidden has-data-calendar-active:md:h-dvh has-data-calendar-active:md:overflow-hidden">
              <Suspense fallback={<HomeAwareHeaderFallback />}>
                <HomeAwareHeader>{headerContent}</HomeAwareHeader>
              </Suspense>
              <OfflineBanner />
              <Suspense fallback={null}>
                <SentryUserLoader />
              </Suspense>
              <Suspense fallback={null}>
                <ImpersonationBannerLoader />
              </Suspense>
              <Suspense fallback={null}>
                <NotificationBarLoader />
              </Suspense>
              <div className="flex flex-1 flex-col px-4 pt-3 pb-28 sm:px-6 sm:pt-4 sm:pb-28 lg:px-8 lg:pt-4 lg:pb-8 group-has-data-calendar-active/sidebar-inset:min-h-0 group-has-data-calendar-active/sidebar-inset:overflow-hidden group-has-data-calendar-active/sidebar-inset:pt-[max(0.75rem,env(safe-area-inset-top))] group-has-data-calendar-active/sidebar-inset:pb-[calc(4.75rem+env(safe-area-inset-bottom))] group-has-data-calendar-active/sidebar-inset:md:min-h-0 group-has-data-calendar-active/sidebar-inset:md:overflow-hidden group-has-data-calendar-active/sidebar-inset:md:pt-2 group-has-data-calendar-active/sidebar-inset:md:pb-20 group-has-data-calendar-active/sidebar-inset:lg:pb-4">
                {children}
              </div>
              <Suspense fallback={<MobileNavShell />}>
                <MobileNavLoader />
              </Suspense>
              <Suspense fallback={null}>
                <MobileMenuLoader />
              </Suspense>
              <PwaInstallBanner />
              <PwaNotificationPrompt />
              <PwaInstallTracker />
              <Suspense fallback={null}>
                <WhatsAppPromptLoader />
              </Suspense>
              <Suspense fallback={null}>
                <DashboardOnboardingLoader />
              </Suspense>
              <Suspense fallback={null}>
                <ModalInteractivityGuard />
              </Suspense>
              <ReleaseNotesModal />
            </SidebarInset>
          </SettingsModalProvider>
        </MobileMenuProvider>
      </SidebarProvider>
    </OpenMinistryRealtimeProvider>
  );
}

function SidebarSkeleton() {
  return (
    <div
      aria-hidden
      className="hidden w-66 shrink-0 border-r bg-sidebar p-4 lg:block"
    >
      <div className="h-9 w-full animate-pulse rounded-lg bg-sidebar-accent" />
      <div className="mt-8 space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-sidebar-accent" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-sidebar-accent" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-sidebar-accent" />
      </div>
    </div>
  );
}

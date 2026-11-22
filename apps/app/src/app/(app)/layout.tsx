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
import { HomeTabProvider } from "@/components/home/home-tab-context";
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
      <SidebarTrigger className="pointer-events-auto hidden md:inline-flex" />
      <CalendarHiddenSlot>
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
            <HomeTabProvider>
              <Suspense fallback={<SidebarSkeleton />}>
                <AppSidebarLoader />
              </Suspense>
              <SidebarInset>
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
                <div className="flex flex-1 flex-col px-4 pt-5 pb-28 sm:px-6 sm:pt-6 sm:pb-28 md:pt-3 md:pb-8 lg:px-8 lg:pt-4 has-[[data-calendar-container]]:md:pt-2">
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
            </HomeTabProvider>
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
      className="hidden w-[16.5rem] shrink-0 border-r bg-sidebar p-4 md:block"
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

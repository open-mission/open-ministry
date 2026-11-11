import { Suspense } from "react";

import { AppSidebarLoader } from "@/components/app/app-sidebar-loader";
import {
  DashboardBreadcrumb,
  DashboardBreadcrumbFallback,
} from "@/components/app/dashboard-breadcrumb";
import { DashboardOnboardingLoader } from "@/components/onboarding/dashboard-onboarding-loader";
import { SentryUserLoader } from "@/components/app/sentry-user-loader";
import { ImpersonationBannerLoader } from "@/components/app/impersonation-banner-loader";
import {
  MobileHeaderLeadingFallback,
  MobileHeaderLeadingLoader,
} from "@/components/app/mobile-header-leading-loader";
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
import { WhatsAppPromptLoader } from "@/components/app/whatsapp-prompt-loader";
import {
  UserMenuFallback,
  UserMenuLoader,
} from "@/components/app/user-menu-loader";
import { Separator } from "@/components/ui/separator";
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
  return (
    <OpenMinistryRealtimeProvider>
      <SidebarProvider>
        <MobileMenuProvider>
          <SettingsModalProvider>
            <Suspense fallback={<SidebarSkeleton />}>
              <AppSidebarLoader />
            </Suspense>
            <SidebarInset>
              <header className="sticky top-0 z-20 flex min-h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:gap-3 sm:px-6">
                <SidebarTrigger className="hidden md:inline-flex" />
                <Suspense fallback={<MobileHeaderLeadingFallback />}>
                  <MobileHeaderLeadingLoader />
                </Suspense>
                <Separator
                  orientation="vertical"
                  className="mr-1 hidden h-4 self-center md:block"
                />
                <Suspense fallback={<DashboardBreadcrumbFallback />}>
                  <DashboardBreadcrumb />
                </Suspense>
                <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                  <Suspense fallback={<NotificationBellFallback />}>
                    <NotificationBellLoader />
                  </Suspense>
                  <div className="flex items-center md:hidden">
                    <Suspense fallback={<UserMenuFallback />}>
                      <UserMenuLoader />
                    </Suspense>
                  </div>
                </div>
              </header>
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
              <div className="flex flex-1 flex-col px-4 pt-5 pb-28 sm:px-6 sm:pt-6 sm:pb-28 md:pb-8 lg:px-8 lg:pt-8">
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
      className="hidden w-64 shrink-0 border-r bg-sidebar p-4 md:block"
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

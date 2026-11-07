import { Suspense } from "react";

import { AppSidebarLoader } from "@/components/app/app-sidebar-loader";
import {
  DashboardBreadcrumb,
  DashboardBreadcrumbFallback,
} from "@/components/app/dashboard-breadcrumb";
import { ImpersonationBannerLoader } from "@/components/app/impersonation-banner-loader";
import { MobileNav } from "@/components/app/mobile-nav";
import { MobileNavShell } from "@/components/app/mobile-nav-shell";
import { NotificationBarLoader } from "@/components/app/notification-bar-loader";
import {
  NotificationBellFallback,
  NotificationBellLoader,
} from "@/components/app/notification-bell-loader";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebarLoader />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-4 self-center" />
          <Suspense fallback={<DashboardBreadcrumbFallback />}>
            <DashboardBreadcrumb />
          </Suspense>
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={<NotificationBellFallback />}>
              <NotificationBellLoader />
            </Suspense>
            <ThemeToggle />
          </div>
        </header>
        <Suspense fallback={null}>
          <ImpersonationBannerLoader />
        </Suspense>
        <Suspense fallback={null}>
          <NotificationBarLoader />
        </Suspense>
        <div className="flex flex-1 flex-col p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6 lg:p-8">
          {children}
        </div>
        <Suspense fallback={<MobileNavShell />}>
          <MobileNav />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
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

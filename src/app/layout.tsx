import { DatadogAppRouter } from "@datadog/browser-rum-nextjs";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import { Suspense } from "react";

import { PwaMobileZoomLock } from "@/components/pwa/pwa-mobile-zoom-lock";
import { ServiceWorker } from "@/components/app/service-worker";
import { UploadThingSSR } from "@/components/app/uploadthing-ssr";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "OpenMinistry",
    template: "%s | OpenMinistry",
  },
  description:
    "Organize pessoas, departamentos, cultos e escalas da sua igreja em um só lugar.",
  applicationName: "OpenMinistry",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpenMinistry",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#264a3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn("font-sans", geist.variable, fraunces.variable)}
    >
      <body>
        <Suspense fallback={null}>
          <DatadogAppRouter />
        </Suspense>
        <Suspense fallback={null}>
          <UploadThingSSR />
        </Suspense>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster mobileOffset={{ bottom: 80 }} />
            <ServiceWorker />
            <PwaMobileZoomLock />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

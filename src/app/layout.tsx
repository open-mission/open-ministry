import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";

import { ServiceWorker } from "@/components/app/service-worker";
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
  viewportFit: "cover",
  themeColor: "#264a3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("font-sans", geist.variable, fraunces.variable)}
    >
      <body>
        <TooltipProvider>
          {children}
          <Toaster mobileOffset={{ bottom: 80 }} />
          <ServiceWorker />
        </TooltipProvider>
      </body>
    </html>
  );
}

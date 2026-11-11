import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "OpenMinistry — Gestão Ministerial e Eclesiástica Moderna",
  description:
    "Organize voluntários, departamentos, escalas inteligentes, repertório de músicas e notificações via WhatsApp da sua igreja em um só lugar.",
  metadataBase: new URL("https://openministry.online"),
  openGraph: {
    title: "OpenMinistry — A plataforma viva da sua igreja",
    description:
      "Escalas sem conflitos, confirmação de presença no WhatsApp, gestão de membros e cifras musicais integradas.",
    url: "https://openministry.online",
    siteName: "OpenMinistry",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenMinistry — Gestão Ministerial Moderna",
    description:
      "A plataforma definitiva para liderança ministerial e voluntários.",
  },
  icons: {
    icon: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#1a3026" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geist.variable} ${fraunces.variable} font-sans`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

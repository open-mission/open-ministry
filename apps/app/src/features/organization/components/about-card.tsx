"use client";

import Link from "next/link";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  HeartIcon,
  LayersIcon,
  PaletteIcon,
  SparklesIcon,
} from "lucide-react";

import { OpenMinistrySymbol } from "@/components/brand/openministry-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APP_BRAND_URL,
  APP_DESCRIPTION,
  APP_DOCS_URL,
  APP_GITHUB_URL,
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
} from "@/lib/version";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function AboutCard() {
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-b from-primary/[0.04] to-transparent">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 border-primary/30 text-primary font-mono text-xs">
                <SparklesIcon className="size-3" />
                v{APP_VERSION}
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-normal text-xs gap-1">
                <CheckCircle2Icon className="size-3" />
                Estável
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Build 2026.11
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <OpenMinistrySymbol className="size-6" />
              </div>
              <div>
                <CardTitle className="font-heading text-2xl tracking-tight">
                  {APP_NAME}
                </CardTitle>
                <p className="text-xs font-medium text-primary tracking-wide uppercase">
                  {APP_TAGLINE}
                </p>
              </div>
            </div>
            <CardDescription className="pt-3 text-sm leading-relaxed text-muted-foreground">
              {APP_DESCRIPTION}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="justify-between text-xs h-9"
            >
              <Link href={APP_DOCS_URL} target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-1.5">
                  <BookOpenIcon className="size-3.5 text-primary" />
                  Documentação API
                </span>
                <ExternalLinkIcon className="size-3 text-muted-foreground" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="justify-between text-xs h-9"
            >
              <Link href={APP_BRAND_URL}>
                <span className="flex items-center gap-1.5">
                  <PaletteIcon className="size-3.5 text-primary" />
                  Guia da Marca (Brand)
                </span>
                <ExternalLinkIcon className="size-3 text-muted-foreground" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="justify-between text-xs h-9"
            >
              <Link href={APP_GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-1.5">
                  <GithubIcon className="size-3.5" />
                  GitHub / Código
                </span>
                <ExternalLinkIcon className="size-3 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Créditos e Equipe */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-rose-500">
            <HeartIcon className="size-4 fill-rose-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Créditos &amp; Desenvolvimento
            </span>
          </div>
          <CardTitle className="font-heading text-lg tracking-tight">
            Comunidade OpenMission
          </CardTitle>
          <CardDescription className="text-xs">
            OpenMinistry é uma iniciativa open-source criada para apoiar igrejas e ministérios a servirem com excelência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            Desenvolvido com carinho para simplificar escalas, organizar departamentos e integrar a comunicação das igrejas de forma moderna, rápida e acessível.
          </p>
          <div className="rounded-xl border bg-muted/20 p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Licença Open Source</p>
              <p className="text-[11px] text-muted-foreground">Distribuído sob licença aberta para o ministério.</p>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              MIT License
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Arquitetura & Stack Tecnológica */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayersIcon className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tecnologias do Sistema
            </span>
          </div>
          <CardTitle className="font-heading text-lg tracking-tight">
            Arquitetura de Alta Performance
          </CardTitle>
          <CardDescription className="text-xs">
            Construído sobre uma infraestrutura moderna, segura e com suporte offline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Frontend &amp; Framework</span>
              <p className="font-medium text-foreground">Next.js 16 (App Router)</p>
              <p className="text-[11px] text-muted-foreground">Turbopack &amp; Partial Prerendering</p>
            </div>

            <div className="rounded-lg border p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Banco de Dados</span>
              <p className="font-medium text-foreground">Neon Serverless Postgres</p>
              <p className="text-[11px] text-muted-foreground">Drizzle ORM &amp; Migrations</p>
            </div>

            <div className="rounded-lg border p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Autenticação</span>
              <p className="font-medium text-foreground">Better Auth + Passkeys</p>
              <p className="text-[11px] text-muted-foreground">Biometria &amp; WebAuthn nativo</p>
            </div>

            <div className="rounded-lg border p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Design System</span>
              <p className="font-medium text-foreground">Tailwind CSS + Shadcn UI</p>
              <p className="text-[11px] text-muted-foreground">Sonner Toasts &amp; Radix Primitives</p>
            </div>

            <div className="rounded-lg border p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Mensageria &amp; WhatsApp</span>
              <p className="font-medium text-foreground">Evolution API Go</p>
              <p className="text-[11px] text-muted-foreground">Notificações multicanal seguras</p>
            </div>

            <div className="rounded-lg border p-2.5 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Offline &amp; Mobile</span>
              <p className="font-medium text-foreground">PWA &amp; Service Worker</p>
              <p className="text-[11px] text-muted-foreground">Cache local para escalas e cultos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

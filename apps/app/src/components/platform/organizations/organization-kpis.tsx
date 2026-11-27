"use client";

import Link from "next/link";
import {
  ActivityIcon,
  Building2Icon,
  CheckCircle2Icon,
  MessageSquareIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { OverviewData } from "./use-organizations-list";

export function OrganizationKpis({ overview }: { overview: OverviewData }) {
  const evolutionProvider = overview.providers.find(
    (p) => p.provider === "evolution_whatsapp",
  );

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-medium">
            <span>Igrejas ativas</span>
            <Building2Icon className="size-4 text-primary" />
          </CardDescription>
          <CardTitle className="font-heading text-3xl tracking-tight">
            {overview.organizations.active}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {overview.organizations.total} total · {overview.organizations.trial}{" "}
          trial · {overview.organizations.suspended} suspensas
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-medium">
            <span>WhatsApp conectado</span>
            <MessageSquareIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardDescription>
          <CardTitle className="font-heading text-3xl tracking-tight">
            {overview.whatsapp.connected}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {overview.whatsapp.enabled} instâncias ativas na plataforma
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-medium">
            <span>Saúde Evolution Go</span>
            <ActivityIcon className="size-4 text-primary" />
          </CardDescription>
          <CardTitle className="flex items-center gap-2 font-heading text-2xl tracking-tight">
            {!evolutionProvider ||
            evolutionProvider.source === "unconfigured" ? (
              <span>Não configurada</span>
            ) : !evolutionProvider.isEnabled ? (
              <span>Pausada</span>
            ) : evolutionProvider.lastHealthStatus === "healthy" ? (
              <>
                <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>Online</span>
              </>
            ) : evolutionProvider.lastHealthStatus ? (
              <span>Atenção</span>
            ) : evolutionProvider.source === "env" ? (
              <span>Via .env</span>
            ) : (
              <span>Configurada</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {evolutionProvider?.lastHealthLatencyMs != null
              ? `Latência ${evolutionProvider.lastHealthLatencyMs}ms`
              : evolutionProvider?.source === "env"
                ? "Ativa via .env"
                : evolutionProvider?.source === "platform"
                  ? "Customizada no painel"
                  : "Sem leitura recente"}
          </span>
          <Link
            href="/platform/integrations"
            className="font-medium text-primary hover:underline"
          >
            Configurar
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

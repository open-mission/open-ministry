"use client";

import Link from "next/link";
import {
  CrownIcon,
  ExternalLinkIcon,
  HandHeartIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { ChurchBrandingForm } from "@/components/church/church-branding-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

type AdminChurchSettingsCardProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date | string;
  };
  peopleCount: number;
  departmentsCount: number;
};

export function AdminChurchSettingsCard({
  organization,
  peopleCount,
  departmentsCount,
}: AdminChurchSettingsCardProps) {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/[0.01]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground gap-1 font-normal">
              <CrownIcon className="size-3" />
              Painel Administrativo
            </Badge>
          </div>
          <CardTitle className="font-heading text-xl tracking-tight">
            Identidade da Igreja
          </CardTitle>
          <CardDescription>
            Personalize o nome oficial e o logotipo da igreja exibidos no painel, aplicativo móvel e convites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChurchBrandingForm
            name={organization.name}
            logo={organization.logo}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">
            Governança e Recursos da Igreja
          </CardTitle>
          <CardDescription>
            Acesso rápido às áreas estratégicas de gestão da sua comunidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start justify-between rounded-xl border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-primary" />
                  <span className="font-medium text-sm">Pessoas e Membros</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {peopleCount} pessoas cadastradas na igreja.
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                    <Link href="/dashboard/members">
                      Gerenciar pessoas
                      <ExternalLinkIcon className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between rounded-xl border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HandHeartIcon className="size-4 text-primary" />
                  <span className="font-medium text-sm">Departamentos</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {departmentsCount} ministérios e departamentos ativos.
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                    <Link href="/dashboard/departments">
                      Gerenciar ministérios
                      <ExternalLinkIcon className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheckIcon className="size-4 text-primary" />
              <span>Dados da Organização</span>
            </div>
            <p>
              Identificador único (slug):{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">
                {organization.slug}
              </code>
            </p>
            <p>
              Espaço criado em {formatDate(new Date(organization.createdAt))}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

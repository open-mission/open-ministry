"use client";

import {
  Building2Icon,
  Settings2Icon,
} from "lucide-react";

import type { PlatformOrganizationRow } from "@/app/actions/platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { OrgStatusBadge, OrgWhatsAppBadge } from "./organization-badges";

export function OrganizationList({
  organizations,
  total,
  onOpenDetail,
  onClearFilters,
}: {
  organizations: PlatformOrganizationRow[];
  total: number;
  onOpenDetail: (orgId: string) => void;
  onClearFilters: () => void;
}) {
  if (organizations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Building2Icon className="size-8 text-muted-foreground/60" />
          <div className="space-y-1">
            <p className="font-heading text-lg font-semibold">
              Nenhuma igreja encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              Ajuste a busca ou limpe os filtros para visualizar todas as
              organizações ({total}).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters}
            className="min-h-11 sm:min-h-9"
          >
            Limpar filtros
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Igreja</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {org.slug}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {org.membersCount}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[11px]">
                    {org.plan?.name ?? "Padrão"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <OrgStatusBadge status={org.status} />
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <OrgWhatsAppBadge whatsapp={org.whatsapp} />
                    {org.whatsapp.connectedPhone ? (
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {org.whatsapp.connectedPhone}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenDetail(org.id)}
                    className="min-h-8 gap-1.5"
                  >
                    <Settings2Icon className="size-3.5" />
                    Gerenciar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-base font-semibold">
                    {org.name}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {org.slug}
                  </p>
                </div>
                <OrgStatusBadge status={org.status} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    {org.plan?.name ?? "Padrão"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {org.membersCount} membros
                  </span>
                </div>
                <OrgWhatsAppBadge whatsapp={org.whatsapp} />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenDetail(org.id)}
                className="min-h-11 w-full gap-2"
              >
                <Settings2Icon className="size-4" />
                Gerenciar igreja
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

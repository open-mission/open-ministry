"use client";

import { CheckCircle2Icon, MailIcon, SparklesIcon, XCircleIcon } from "lucide-react";

import type { EmailStats } from "@/app/actions/emails";
import { Card } from "@/components/ui/card";

type EmailsKpiCardsProps = {
  stats: EmailStats;
  deliveryRate: number;
};

export function EmailsKpiCards({ stats, deliveryRate }: EmailsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Total disparados
          </span>
          <MailIcon className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">
          {stats.total}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Emails transacionais e avisos
        </p>
      </Card>

      <Card className="p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Entregues
          </span>
          <CheckCircle2Icon className="size-4 text-emerald-600" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {stats.sent}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Aceitos pela API Brevo
        </p>
      </Card>

      <Card className="p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Falhas
          </span>
          <XCircleIcon className="size-4 text-rose-600" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
          {stats.failed}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Erros de envio ou rejeições
        </p>
      </Card>

      <Card className="p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Taxa de sucesso
          </span>
          <SparklesIcon className="size-4 text-primary" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-primary">
          {deliveryRate}%
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Entregabilidade geral
        </p>
      </Card>
    </div>
  );
}

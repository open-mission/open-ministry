"use client";

import { MailIcon, RefreshCwIcon, SearchIcon } from "lucide-react";

import type { EmailLogItem } from "@/app/actions/emails";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { EmailsLogsTable } from "./emails-logs-table";
import type { EmailStatusFilter } from "./types";

type EmailsHistoryTabProps = {
  filteredLogs: EmailLogItem[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: EmailStatusFilter;
  onStatusFilterChange: (value: EmailStatusFilter) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  isPending: boolean;
  onRefresh: () => void;
  onOpenLog: (log: EmailLogItem) => void;
  onResend: (log: EmailLogItem) => void;
};

export function EmailsHistoryTab({
  filteredLogs,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  isPending,
  onRefresh,
  onOpenLog,
  onResend,
}: EmailsHistoryTabProps) {
  return (
    <Card className="shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Histórico de Disparos</CardTitle>
            <CardDescription className="text-xs">
              Registro detalhado de cada email transacional enviado pelo Brevo.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCwIcon
              className={`size-3.5 ${isPending ? "animate-spin" : ""}`}
            />
            <span>Atualizar</span>
          </Button>
        </div>

        {/* Filtros */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          <div className="relative sm:col-span-6">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por destinatário ou assunto..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <NativeSelect
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(
                  e.target.value as "all" | "sent" | "failed",
                )
              }
              className="h-8 text-xs"
            >
              <NativeSelectOption value="all">
                Todos os status
              </NativeSelectOption>
              <NativeSelectOption value="sent">
                Enviados com sucesso
              </NativeSelectOption>
              <NativeSelectOption value="failed">
                Falhas de envio
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="sm:col-span-3">
            <NativeSelect
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="h-8 text-xs"
            >
              <NativeSelectOption value="all">
                Todos os tipos
              </NativeSelectOption>
              <NativeSelectOption value="assignment">
                Escalas de Culto
              </NativeSelectOption>
              <NativeSelectOption value="announcement">
                Avisos da Igreja
              </NativeSelectOption>
              <NativeSelectOption value="rehearsal_reminder">
                Lembretes de Ensaio
              </NativeSelectOption>
              <NativeSelectOption value="welcome">Boas-vindas</NativeSelectOption>
              <NativeSelectOption value="reset_password">
                Redefinição de Senha
              </NativeSelectOption>
              <NativeSelectOption value="magic_link">
                Link Mágico
              </NativeSelectOption>
              <NativeSelectOption value="email_verification">
                Verificação
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <MailIcon className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-sm font-semibold">
              Nenhum email encontrado
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {search || statusFilter !== "all" || typeFilter !== "all"
                ? "Nenhum disparo corresponde aos filtros aplicados. Tente ajustar os termos."
                : "Nenhum email transacional foi registrado ainda nesta comunidade."}
            </p>
          </div>
        ) : (
          <EmailsLogsTable
            logs={filteredLogs}
            isPending={isPending}
            onOpenLog={onOpenLog}
            onResend={onResend}
          />
        )}
      </CardContent>
    </Card>
  );
}

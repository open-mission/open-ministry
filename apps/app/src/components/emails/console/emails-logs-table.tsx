"use client";

import {
  CheckCircle2Icon,
  EyeIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";

import type { EmailLogItem } from "@/app/actions/emails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatEmailDate, formatTypeName } from "./email-format";

type EmailsLogsTableProps = {
  logs: EmailLogItem[];
  isPending: boolean;
  onOpenLog: (log: EmailLogItem) => void;
  onResend: (log: EmailLogItem) => void;
};

export function EmailsLogsTable({
  logs,
  isPending,
  onOpenLog,
  onResend,
}: EmailsLogsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Destinatário</TableHead>
            <TableHead>Assunto</TableHead>
            <TableHead className="w-[120px]">Tipo</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[140px]">Data & Hora</TableHead>
            <TableHead className="w-[110px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isSent = log.status === "sent";

            return (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {log.recipientName || "Membro"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {log.recipientEmail}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="line-clamp-1 text-xs text-foreground">
                    {log.subject}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-[10px] capitalize px-1.5 py-0"
                  >
                    {formatTypeName(log.type)}
                  </Badge>
                </TableCell>

                <TableCell>
                  {isSent ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    >
                      <CheckCircle2Icon className="size-3" />
                      <span>Enviado</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="destructive"
                      className="gap-1 text-[10px] px-1.5 py-0"
                    >
                      <XCircleIcon className="size-3" />
                      <span>Falhou</span>
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-[11px] text-muted-foreground">
                  {formatEmailDate(log.createdAt)}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onOpenLog(log)}
                      title="Visualizar email enviado"
                    >
                      <EyeIcon className="size-3.5 text-muted-foreground" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onResend(log)}
                      disabled={isPending}
                      title="Reenviar este email"
                    >
                      <RefreshCwIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

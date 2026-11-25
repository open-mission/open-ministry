"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  listEmailLogsAction,
  resendEmailAction,
  type EmailLogItem,
  type EmailStats,
} from "@/app/actions/emails";

import type {
  EmailStatusFilter,
  LogFilters,
} from "./types";

export function filterEmailLogs(
  logs: EmailLogItem[],
  { search, statusFilter, typeFilter }: LogFilters,
): EmailLogItem[] {
  return logs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== "all" && log.type !== typeFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesEmail = log.recipientEmail.toLowerCase().includes(q);
      const matchesName = (log.recipientName || "").toLowerCase().includes(q);
      const matchesSubject = log.subject.toLowerCase().includes(q);
      if (!matchesEmail && !matchesName && !matchesSubject) {
        return false;
      }
    }
    return true;
  });
}

type UseEmailsConsoleArgs = {
  initialLogs: EmailLogItem[];
  initialStats: EmailStats;
};

export function useEmailsConsole({
  initialLogs,
  initialStats,
}: UseEmailsConsoleArgs) {
  const [logs, setLogs] = useState<EmailLogItem[]>(initialLogs);
  const [stats, setStats] = useState<EmailStats>(initialStats);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmailStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  function handleRefreshLogs() {
    startTransition(async () => {
      const res = await listEmailLogsAction({
        search: search.trim() || undefined,
        status: statusFilter,
        type: typeFilter,
      });

      if (res.ok) {
        setLogs(res.logs);
        setStats(res.stats);
        toast.success("Histórico de emails atualizado.");
      } else {
        toast.error(res.error || "Não foi possível carregar os emails.");
      }
    });
  }

  function handleResend(log: EmailLogItem) {
    startTransition(async () => {
      const res = await resendEmailAction(log.id);
      if (res.ok) {
        toast.success(`Email reenviado com sucesso para ${log.recipientEmail}!`);
        const updated = await listEmailLogsAction({
          search: search.trim() || undefined,
          status: statusFilter,
          type: typeFilter,
        });
        if (updated.ok) {
          setLogs(updated.logs);
          setStats(updated.stats);
        }
      } else {
        toast.error(res.error || "Erro ao reenviar email.");
      }
    });
  }

  const filteredLogs = useMemo(
    () => filterEmailLogs(logs, { search, statusFilter, typeFilter }),
    [logs, search, statusFilter, typeFilter],
  );

  const deliveryRate =
    stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 100;

  return {
    logs,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    isPending,
    startTransition,
    filteredLogs,
    deliveryRate,
    handleRefreshLogs,
    handleResend,
  } as const;
}

export type EmailsConsoleState = ReturnType<typeof useEmailsConsole>;

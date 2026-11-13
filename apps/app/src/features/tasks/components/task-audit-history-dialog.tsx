"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2Icon,
  ClockIcon,
  HistoryIcon,
  Loader2Icon,
  PlusCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTaskAuditHistoryAction } from "../actions/tasks.actions";
import {
  formatAuditActionInfo,
  formatAuditChangeLine,
  type AuditLookups,
} from "../lib/task-helpers";
import type { TaskItem } from "../services/tasks-service";

type AuditLogItem = {
  id: string;
  taskId: string;
  action: string;
  details: unknown;
  createdAt: Date | string;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type TaskAuditHistoryDialogProps = {
  task: TaskItem | null;
  open: boolean;
  onClose: () => void;
  members?: { userId: string; name: string }[];
  departments?: { id: string; name: string }[];
  nested?: boolean;
};

export function TaskAuditHistoryDialog({
  task,
  open,
  onClose,
  members = [],
  departments = [],
  nested = false,
}: TaskAuditHistoryDialogProps) {
  const isMobile = useIsMobile();
  const [fetchResult, setFetchResult] = useState<{
    taskId: string;
    error: string | null;
    logs: AuditLogItem[];
  } | null>(null);

  const lookups = useMemo<AuditLookups>(() => {
    const peopleByUserId: Record<string, string> = {};
    for (const m of members) {
      peopleByUserId[m.userId] = m.name;
    }
    const departmentsById: Record<string, string> = {};
    for (const d of departments) {
      departmentsById[d.id] = d.name;
    }
    return { peopleByUserId, departmentsById };
  }, [members, departments]);

  useEffect(() => {
    if (!open || !task) {
      return;
    }

    let cancelled = false;

    getTaskAuditHistoryAction(task.id).then((res) => {
      if (cancelled) return;
      setFetchResult({
        taskId: task.id,
        error: res.ok ? null : res.error,
        logs: res.ok ? (res.data as AuditLogItem[]) : [],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, task]);

  const hasCurrentResult = Boolean(task && fetchResult?.taskId === task.id);
  const loading = Boolean(open && task && !hasCurrentResult);
  const error = hasCurrentResult && fetchResult ? fetchResult.error : null;
  const logs = hasCurrentResult && fetchResult ? fetchResult.logs : [];

  const renderDetails = (log: AuditLogItem) => {
    const detailsObj =
      log.details && typeof log.details === "object"
        ? (log.details as Record<string, unknown>)
        : null;

    if (!detailsObj) return null;

    if (log.action === "created") {
      const dispatchedCount =
        typeof detailsObj.dispatchedCount === "number"
          ? detailsObj.dispatchedCount
          : null;
      if (dispatchedCount !== null && dispatchedCount > 0) {
        return (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Delegada individualmente para {dispatchedCount}{" "}
            {dispatchedCount === 1 ? "membro" : "membros"} do departamento.
          </p>
        );
      }
      return null;
    }

    if (log.action === "reordered") {
      const count =
        typeof detailsObj.count === "number" ? detailsObj.count : null;
      return (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {count ? `Ordem ajustada em bloco (${count} tarefas).` : "Posição reordenada na lista."}
        </p>
      );
    }

    const lines = Object.entries(detailsObj)
      .map(([field, change]) => {
        if (!change || typeof change !== "object") return null;
        return formatAuditChangeLine(
          field,
          change as { from?: unknown; to?: unknown; old?: unknown; new?: unknown },
          lookups,
        );
      })
      .filter((item): item is { fieldLabel: string; summary: string } => Boolean(item));

    if (lines.length === 0) return null;

    return (
      <div className="mt-2 space-y-1 rounded-lg border bg-muted/40 p-2.5 text-xs">
        {lines.map((line, idx) => (
          <div key={`${line.fieldLabel}-${idx}`} className="flex flex-wrap gap-1.5">
            <span className="font-medium text-foreground">{line.fieldLabel}:</span>
            <span className="text-muted-foreground">{line.summary}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderActionBadge = (action: string) => {
    const info = formatAuditActionInfo(action);
    if (info.tone === "create") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        >
          <PlusCircleIcon className="mr-1 size-3" />
          {info.label}
        </Badge>
      );
    }
    if (info.tone === "complete") {
      return (
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary"
        >
          <CheckCircle2Icon className="mr-1 size-3" />
          {info.label}
        </Badge>
      );
    }
    if (info.tone === "reopen") {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          <RefreshCwIcon className="mr-1 size-3" />
          {info.label}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <SparklesIcon className="mr-1 size-3" />
        {info.label}
      </Badge>
    );
  };

  const content = (
    <div className="space-y-4 py-2">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Loader2Icon className="size-6 animate-spin text-primary" />
          <p className="mt-2 text-sm">Carregando histórico...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center text-muted-foreground">
          <HistoryIcon className="mb-2 size-8 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhum registro ainda</p>
          <p className="mt-1 text-xs">
            As próximas atualizações desta tarefa aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="relative space-y-4 pl-6 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-border">
          {logs.map((log) => (
            <div key={log.id} className="relative space-y-1">
              <span className="absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background shadow-xs">
                <span className="size-1.5 rounded-full bg-primary" />
              </span>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {log.actor?.name ?? "Membro da equipe"}
                  </span>
                  {renderActionBadge(log.action)}
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {formatDistanceToNow(new Date(log.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>

              {renderDetails(log)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    const Wrapper = nested ? DrawerNestedRoot : Drawer;
    return (
      <Wrapper open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="px-4 pb-6 max-h-[85vh]">
          <DrawerHeader className="!text-left px-0">
            <DrawerTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <HistoryIcon className="size-5 text-primary" />
              Histórico de alterações
            </DrawerTitle>
            <DrawerDescription>
              {task?.title ?? "Registro de atividades da tarefa"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto [-webkit-overflow-scrolling:touch] pr-1">
            {content}
          </div>
          <div className="pt-3 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] w-full"
            >
              Fechar
            </Button>
          </div>
        </DrawerContent>
      </Wrapper>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
            <HistoryIcon className="size-5 text-primary" />
            Histórico de alterações
          </DialogTitle>
          <DialogDescription>
            {task?.title ?? "Registro cronológico de atividades da tarefa."}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

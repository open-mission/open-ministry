"use client";

import { useEffect, useState, useTransition } from "react";
import { HistoryIcon, Loader2Icon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateTime, getInitials } from "@/lib/format";
import { getTaskAuditHistoryAction } from "../actions/tasks.actions";
import { getStatusLabel } from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";

type TaskAuditHistoryDialogProps = {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AuditLogRow = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

export function TaskAuditHistoryDialog({
  task,
  open,
  onOpenChange,
}: TaskAuditHistoryDialogProps) {
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    if (open && task?.id) {
      startTransition(async () => {
        const res = await getTaskAuditHistoryAction(task.id);
        if (isMounted && res.ok && res.data) {
          setLogs(res.data as AuditLogRow[]);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, task?.id]);

  if (!task) return null;

  const logsContent = isPending ? (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Loader2Icon className="size-6 animate-spin text-primary" />
      <p className="mt-2 text-xs">Carregando histórico auditável...</p>
    </div>
  ) : logs.length === 0 ? (
    <div className="py-8 text-center text-xs text-muted-foreground">
      Nenhum registro de auditoria disponível para esta tarefa.
    </div>
  ) : (
    <div className="relative pl-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-border">
      {logs.map((log) => (
        <div key={log.id} className="relative mb-5 last:mb-0">
          <div className="absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs">
            <span className="size-1.5 rounded-full bg-primary" />
          </div>

          <div className="rounded-lg border bg-card p-3 text-xs shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Avatar className="size-5">
                  {log.actor?.image ? (
                    <AvatarImage
                      src={log.actor.image}
                      alt={log.actor.name ?? "Autor"}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {log.actor?.name
                      ? getInitials(log.actor.name)
                      : <UserIcon className="size-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">
                  {log.actor?.name ?? "Sistema / Liderança"}
                </span>
              </div>
              <time className="text-[11px] text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </time>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <ActionBadge action={log.action} />
              <span className="text-muted-foreground">
                {renderActionText(log.action, log.details)}
              </span>
            </div>

            {renderDiffDetails(log.details)}
          </div>
        </div>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HistoryIcon className="size-4" />
              </span>
              <DrawerTitle className="font-heading text-base font-semibold tracking-tight">
                Histórico de Alterações
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground !text-left mt-0.5 truncate">
              Auditoria de atividades:{" "}
              <span className="font-medium text-foreground">{task.title}</span>
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[75vh] overflow-y-auto px-5 py-4 [-webkit-overflow-scrolling:touch]">
            {logsContent}
          </div>

          <DrawerFooter className="border-t px-5 pt-2 pb-4">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full min-h-[44px]">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HistoryIcon className="size-4" />
            </span>
            <DialogTitle>Histórico de Alterações</DialogTitle>
          </div>
          <DialogDescription className="truncate">
            Auditoria de atividades da tarefa:{" "}
            <span className="font-medium text-foreground">{task.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {logsContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionBadge({ action }: { action: string }) {
  switch (action) {
    case "created":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Criação
        </Badge>
      );
    case "status_changed":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          Status
        </Badge>
      );
    case "reordered":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Reordenação
        </Badge>
      );
    case "deleted":
      return (
        <Badge variant="destructive">
          Exclusão
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          Edição
        </Badge>
      );
  }
}

function renderActionText(action: string, details: Record<string, unknown>) {
  if (action === "created") {
    return "criou esta tarefa";
  }
  if (action === "status_changed") {
    const statusChange = details.status as { from?: string; to?: string } | undefined;
    if (statusChange?.to) {
      return `alterou status para "${getStatusLabel(statusChange.to as TaskStatus)}"`;
    }
    return "atualizou o status da tarefa";
  }
  if (action === "reordered") {
    return "reorganizou a ordem da tarefa";
  }
  return "atualizou informações da tarefa";
}

function renderDiffDetails(details: Record<string, unknown>) {
  if (!details || typeof details !== "object") return null;

  const entries = Object.entries(details).filter(
    ([key]) => key !== "count" && key !== "orderedTaskIds",
  );

  if (entries.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 rounded bg-muted/50 p-2 text-[11px] text-muted-foreground font-mono">
      {entries.map(([key, val]) => {
        if (typeof val === "object" && val !== null && "from" in val && "to" in val) {
          const fromVal = String((val as { from?: unknown }).from ?? "vazio");
          const toVal = String((val as { to?: unknown }).to ?? "vazio");
          return (
            <div key={key} className="truncate">
              <span className="font-semibold text-foreground">{key}:</span>{" "}
              <span className="line-through text-red-500/80">{fromVal}</span> ➔{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{toVal}</span>
            </div>
          );
        }
        return (
          <div key={key} className="truncate">
            <span className="font-semibold text-foreground">{key}:</span>{" "}
            {typeof val === "object" ? JSON.stringify(val) : String(val)}
          </div>
        );
      })}
    </div>
  );
}

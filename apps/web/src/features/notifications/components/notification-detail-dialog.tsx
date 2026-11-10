"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BellIcon,
  CheckCheckIcon,
  ClipboardListIcon,
  MegaphoneIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNotificationStore } from "@/lib/notification-store";

export type NotificationDetailItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt?: string | Date;
  createdAtLabel?: string;
};

function formatDetailTime(
  dateValue?: string | Date,
  fallbackLabel?: string,
): string {
  if (fallbackLabel) return fallbackLabel;
  if (!dateValue) return "Recentemente";

  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return "Recentemente";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function NotificationDetailDialog({
  open,
  onOpenChange,
  notification,
  onMarkAsRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: NotificationDetailItem | null;
  onMarkAsRead?: (id: string) => void;
}) {
  const { markAsRead } = useNotificationStore();
  const [markedReadId, setMarkedReadId] = useState<string | null>(null);

  if (!notification) return null;

  const isRead = Boolean(
    notification.read || markedReadId === notification.id,
  );

  const handleMarkRead = () => {
    if (!isRead) {
      setMarkedReadId(notification.id);
      markAsRead(notification.id);
      onMarkAsRead?.(notification.id);
      toast.success("Aviso marcado como lido!");
    }
  };

  const isAnnouncement = notification.type === "announcement";
  const isSchedule =
    notification.type === "schedule_assigned" ||
    notification.type === "schedule_removed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isAnnouncement ? (
                <Badge
                  variant="secondary"
                  className="gap-1.5 border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  <MegaphoneIcon className="size-3.5" />
                  <span>Aviso da liderança</span>
                </Badge>
              ) : isSchedule ? (
                <Badge
                  variant="secondary"
                  className="gap-1.5 border-primary/20 bg-primary/10 text-primary"
                >
                  <ClipboardListIcon className="size-3.5" />
                  <span>Escala de culto</span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
                  <BellIcon className="size-3.5" />
                  <span>Notificação</span>
                </Badge>
              )}
            </div>

            {isRead ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs font-normal text-emerald-600 dark:text-emerald-400"
              >
                <CheckCheckIcon className="size-3" />
                <span>Lida</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-xs font-normal text-primary"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                <span>Não lida</span>
              </Badge>
            )}
          </div>

          <DialogTitle className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {notification.title}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground">
            Enviado em{" "}
            {formatDetailTime(
              notification.createdAt,
              notification.createdAtLabel,
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable message content container */}
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
          <div className="max-h-[48vh] sm:max-h-[55vh] overflow-y-auto pr-1 text-sm leading-relaxed text-foreground select-text whitespace-pre-wrap">
            {notification.body ? (
              notification.body
            ) : (
              <p className="italic text-muted-foreground">
                Nenhum texto adicional nesta notificação.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          {!isRead ? (
            <Button
              type="button"
              onClick={handleMarkRead}
              className="w-full gap-2 sm:w-auto"
            >
              <CheckCheckIcon className="size-4" />
              <span>Marcar como lida</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {notification.href ? (
              <Button
                variant="outline"
                asChild
                onClick={() => onOpenChange(false)}
                className="w-full gap-1.5 sm:w-auto"
              >
                <Link href={notification.href}>
                  <span>Acessar detalhes</span>
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

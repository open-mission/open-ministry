"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  MegaphoneIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from "@/components/notifications/notification-detail-dialog";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { useNotificationStore } from "@/lib/notification-store";
import { cn } from "@/lib/utils";

export type UnreadAnnouncementItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
};

function formatAnnouncementTime(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return "Hoje";

  // Durante prerender / SSR, evita Date.now() para manter pureza e evitar hydration mismatch
  if (typeof window === "undefined") {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Agora mesmo";
  if (diffMinutes < 60) return `Há ${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `Há ${diffDays}d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function UnreadAnnouncementsWidget({
  initialAnnouncements,
}: {
  initialAnnouncements: UnreadAnnouncementItem[];
}) {
  const [announcements, setAnnouncements] =
    useState<UnreadAnnouncementItem[]>(initialAnnouncements);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<NotificationDetailItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { markAsRead } = useNotificationStore();

  if (announcements.length === 0) {
    return null;
  }

  const handleOpenDetail = (item: UnreadAnnouncementItem) => {
    setSelectedAnnouncement({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href,
      read: false,
      createdAt: item.createdAt,
    });
    setDialogOpen(true);
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      markAsRead(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      await markNotificationReadAction(id);
      toast.success("Aviso marcado como lido.");
    } catch {
      toast.error("Não foi possível marcar como lido.");
    }
  };

  return (
    <>
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] via-card to-card shadow-xs transition-all">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <MegaphoneIcon className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-base sm:text-lg">
                  Avisos importantes
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-400 tabular-nums"
                >
                  {announcements.length}{" "}
                  {announcements.length === 1 ? "não lido" : "não lidos"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Comunicados da liderança para você e sua equipe.
              </CardDescription>
            </div>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/announcements">
              <span>Ver todos</span>
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-2.5 pt-0">
          {announcements.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/[0.02] hover:shadow-xs",
              )}
            >
              <button
                type="button"
                onClick={() => handleOpenDetail(item)}
                className="min-w-0 flex-1 space-y-1 text-left cursor-pointer rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Abrir comunicado: ${item.title}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="truncate font-semibold text-xs sm:text-sm text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h4>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {formatAnnouncementTime(item.createdAt)}
                  </span>
                </div>

                {item.body ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                ) : null}
              </button>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Marcar como lido"
                  aria-label="Marcar como lido"
                  onClick={(e) => handleMarkRead(item.id, e)}
                >
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Marcar como lido</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <NotificationDetailDialog
        notification={selectedAnnouncement}
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next && selectedAnnouncement) {
            // Remove from widget list after being opened and read
            setAnnouncements((prev) =>
              prev.filter((a) => a.id !== selectedAnnouncement.id),
            );
          }
        }}
      />
    </>
  );
}

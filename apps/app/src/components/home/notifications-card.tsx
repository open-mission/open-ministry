"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";

import { markNotificationReadAction } from "@/app/actions/notifications";
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from "@/components/notifications/notification-detail-dialog";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { HomeListItem } from "@/components/home/home-list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/lib/notification-store";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
};

const dotByType: Record<string, string> = {
  announcement: "bg-primary",
  schedule: "bg-secondary",
  task: "bg-accent-foreground",
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Recentemente";
  return timeFormatter.format(date);
}

export function NotificationsCard({
  announcements,
}: {
  announcements: NotificationItem[];
}) {
  const [items, setItems] = useState<NotificationItem[]>(announcements);
  const [selected, setSelected] = useState<NotificationDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { markAsRead } = useNotificationStore();

  if (items.length === 0) {
    return null;
  }

  const handleOpen = (item: NotificationItem) => {
    setSelected({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href,
      read: false,
      createdAt: item.createdAt,
    });
    setDetailOpen(true);
  };

  const handleMarkRead = async (id: string) => {
    markAsRead(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await markNotificationReadAction(id);
    } catch {
      toast.error("Não foi possível marcar o aviso como lido.");
    }
  };

  return (
    <HomeSection aria-labelledby="home-notifications-title">
      <HomeSectionHeader>
        <div className="flex items-center gap-2">
          <HomeSectionTitle id="home-notifications-title">
            Avisos e notificações
          </HomeSectionTitle>
          <Badge variant="secondary" className="text-[11px] tabular-nums">
            {items.length} novos
          </Badge>
        </div>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/notifications">
              Ver todos
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard>
        <HomeCardContent className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleOpen(item)}
                className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Abrir aviso: ${item.title}`}
              >
                <HomeListItem
                  leading={
                    <span
                      className={`size-2 rounded-full ${
                        dotByType[item.type] ?? "bg-primary"
                      }`}
                      aria-hidden="true"
                    />
                  }
                  title={item.title}
                  meta={item.body ?? "Comunicado da igreja"}
                  trailing={
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatTime(item.createdAt)}
                    </span>
                  }
                />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-h-[44px] shrink-0 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => handleMarkRead(item.id)}
              >
                Marcar como lido
              </Button>
            </div>
          ))}
        </HomeCardContent>
      </HomeCard>

      <NotificationDetailDialog
        notification={selected}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next && selected) {
            setItems((prev) => prev.filter((item) => item.id !== selected.id));
          }
        }}
        onMarkAsRead={(id) => {
          markAsRead(id);
          setItems((prev) => prev.filter((item) => item.id !== id));
        }}
      />
    </HomeSection>
  );
}

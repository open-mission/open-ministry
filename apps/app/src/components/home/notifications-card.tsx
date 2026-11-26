"use client";

import { useState } from "react";
import { BellIcon, ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";

import { markNotificationReadAction } from "@/app/actions/notifications";
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from "@/components/notifications/notification-detail-dialog";
import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { HomeListItem } from "@/components/home/home-list-item";
import { Badge } from "@/components/ui/badge";
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
  schedule: "bg-chart-2",
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
  variant = "card",
}: {
  announcements: NotificationItem[];
  variant?: "card" | "folio" | "mobile-strip";
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

  const dialog = (
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
        void markNotificationReadAction(id).catch(() => {
          toast.error("Não foi possível marcar o aviso como lido.");
        });
      }}
    />
  );

  if (variant === "mobile-strip") {
    const item = items[0];

    return (
      <>
        <button
          type="button"
          onClick={() => handleOpen(item)}
          aria-label={`Abrir aviso: ${item.title}`}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border/70 border-l-2 border-l-primary bg-card py-3 pr-3 pl-4 text-left shadow-xs transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="block truncate text-[11px] font-semibold tracking-wider text-primary uppercase">
              Aviso não lido · {formatTime(item.createdAt)}
            </span>
            <span className="block truncate text-sm font-medium text-foreground">
              {item.title}
            </span>
          </span>
          <ChevronRightIcon
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
        </button>
        {dialog}
      </>
    );
  }

  if (variant === "folio") {
    return (
      <>
        <section
          aria-labelledby="home-notifications-title"
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <BellIcon className="size-4 text-primary" aria-hidden="true" />
            <h2
              id="home-notifications-title"
              className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground"
            >
              Avisos não lidos
            </h2>
            <Badge className="border-0 bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground tabular-nums">
              {items.length}
            </Badge>
          </div>

          <div className="flex flex-col divide-y divide-border/70">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpen(item)}
                className="flex min-h-11 w-full items-center rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Abrir aviso: ${item.title}`}
              >
                <HomeListItem
                  leading={
                    <span
                      className={`block size-2 rounded-full ${
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
            ))}
          </div>
        </section>
        {dialog}
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="home-notifications-title">
        <HomeCard>
          <HomeCardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <BellIcon className="size-4 text-primary" aria-hidden="true" />
              <h2
                id="home-notifications-title"
                className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg"
              >
                Avisos e notificações
              </h2>
              <Badge className="border-0 bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground tabular-nums">
                {items.length} {items.length === 1 ? "novo" : "novos"}
              </Badge>
            </div>

            <div className="flex flex-col">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpen(item)}
                  className="flex min-h-11 w-full items-center rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Abrir aviso: ${item.title}`}
                >
                  <HomeListItem
                    leading={
                      <span
                        className={`block size-2 rounded-full ${
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
              ))}
            </div>
          </HomeCardContent>
        </HomeCard>
      </section>

      {dialog}
    </>
  );
}

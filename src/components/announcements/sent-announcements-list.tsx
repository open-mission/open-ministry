"use client";

import { useMemo, useState } from "react";
import {
  CheckCheckIcon,
  ClockIcon,
  EyeIcon,
  MegaphoneIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SentAnnouncementReceipt } from "@/lib/notifications";

function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Recentemente";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SentAnnouncementsList({
  announcements,
}: {
  announcements: SentAnnouncementReceipt[];
}) {
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<SentAnnouncementReceipt | null>(null);

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl tracking-tight">
            Avisos Enviados &amp; Leituras
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe quem recebeu e confirmou a leitura dos comunicados.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {announcements.map((item) => {
          const readRate =
            item.totalRecipients > 0
              ? Math.round((item.readRecipients / item.totalRecipients) * 100)
              : 0;

          return (
            <Card
              key={item.key}
              className="flex flex-col justify-between transition-shadow hover:shadow-md"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                  >
                    <MegaphoneIcon className="size-3" />
                    <span>Aviso</span>
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <CardTitle className="font-heading text-base leading-snug tracking-tight">
                  {item.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {item.body ?? "Sem mensagem adicional."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Confirmaram leitura
                    </span>
                    <span className="font-semibold text-foreground">
                      {item.readRecipients} de {item.totalRecipients} ({readRate}%)
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${readRate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Por: {item.actorName}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAnnouncement(item)}
                      className="h-7 gap-1 px-2.5 text-xs"
                    >
                      <EyeIcon className="size-3" />
                      <span>Ver leituras</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SentAnnouncementDetailDialog
        open={Boolean(selectedAnnouncement)}
        onOpenChange={(open) => !open && setSelectedAnnouncement(null)}
        announcement={selectedAnnouncement}
      />
    </section>
  );
}

function SentAnnouncementDetailDialog({
  open,
  onOpenChange,
  announcement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: SentAnnouncementReceipt | null;
}) {
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [search, setSearch] = useState("");

  const filteredRecipients = useMemo(() => {
    if (!announcement) return [];
    return announcement.recipients.filter((r) => {
      if (filter === "read" && !r.readAt) return false;
      if (filter === "unread" && r.readAt) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(query) ||
          (r.email && r.email.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [announcement, filter, search]);

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-xl">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <MegaphoneIcon className="size-4" />
            </span>
            <div>
              <DialogTitle className="font-heading text-lg sm:text-xl">
                {announcement.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enviado em {formatDateTime(announcement.createdAt)} por{" "}
                {announcement.actorName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Message body preview with scroll */}
        {announcement.body ? (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="max-h-[25vh] overflow-y-auto text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
              {announcement.body}
            </p>
          </div>
        ) : null}

        {/* Read metrics and recipients list */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <CheckCheckIcon className="size-3" />
                <span>{announcement.readRecipients} confirmaram leitura</span>
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <UsersIcon className="size-3 mr-1" />
                <span>
                  {announcement.totalRecipients - announcement.readRecipients}{" "}
                  pendentes
                </span>
              </Badge>
            </div>

            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as "all" | "read" | "unread")}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2.5">
                  Todos ({announcement.totalRecipients})
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs px-2.5">
                  Lidos ({announcement.readRecipients})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs px-2.5">
                  Pendentes (
                  {announcement.totalRecipients - announcement.readRecipients})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {announcement.totalRecipients > 6 ? (
            <div className="relative">
              <SearchIcon className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar destinatário por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          ) : null}

          <div className="max-h-[35vh] divide-y divide-border/40 overflow-y-auto rounded-xl border border-border/60">
            {filteredRecipients.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Nenhum destinatário encontrado neste filtro.
              </div>
            ) : (
              filteredRecipients.map((recipient) => (
                <div
                  key={recipient.userId}
                  className="flex items-center justify-between gap-3 p-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-7">
                      {recipient.image ? (
                        <AvatarImage src={recipient.image} alt={recipient.name} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(recipient.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {recipient.name}
                      </p>
                      {recipient.email ? (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {recipient.email}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    {recipient.readAt ? (
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCheckIcon className="size-3.5" />
                        <span>Lido em {formatDateTime(recipient.readAt)}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <ClockIcon className="size-3.5" />
                        <span>Aguardando</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

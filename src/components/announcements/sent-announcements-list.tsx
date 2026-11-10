"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  Loader2Icon,
  MegaphoneIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  retryAnnouncementSingleWhatsAppAction,
  retryAnnouncementWhatsAppAction,
} from "@/app/actions/notifications";
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
  canRetry = true,
}: {
  announcements: SentAnnouncementReceipt[];
  canRetry?: boolean;
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

                  {item.whatsappSummary && item.whatsappSummary.total > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <MessageSquareIcon className="size-3" />
                        {item.whatsappSummary.delivered + item.whatsappSummary.read} no WhatsApp
                      </span>
                      {item.whatsappSummary.failed > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          {item.whatsappSummary.failed} falha(s)
                        </Badge>
                      )}
                      {item.whatsappSummary.pending +
                        item.whatsappSummary.sending >
                        0 && (
                        <Badge
                          variant="outline"
                          className="h-4 border-amber-500/30 px-1.5 text-[10px] text-amber-600 bg-amber-500/5"
                        >
                          {item.whatsappSummary.pending +
                            item.whatsappSummary.sending}{" "}
                          na fila
                        </Badge>
                      )}
                    </div>
                  )}

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
        canRetry={canRetry}
      />
    </section>
  );
}

function SentAnnouncementDetailDialog({
  open,
  onOpenChange,
  announcement,
  canRetry = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: SentAnnouncementReceipt | null;
  canRetry?: boolean;
}) {
  const [filter, setFilter] = useState<
    "all" | "read" | "unread" | "wa_ok" | "wa_pending"
  >("all");
  const [search, setSearch] = useState("");
  const [isRetrying, startRetrying] = useTransition();
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const filteredRecipients = useMemo(() => {
    if (!announcement) return [];
    return announcement.recipients.filter((r) => {
      if (filter === "read" && !r.readAt) return false;
      if (filter === "unread" && r.readAt) return false;
      if (filter === "wa_ok") {
        if (!r.whatsapp) return false;
        if (r.whatsapp.status !== "delivered" && r.whatsapp.status !== "read" && r.whatsapp.status !== "sent") {
          return false;
        }
      }
      if (filter === "wa_pending") {
        if (!r.whatsapp) return false;
        if (r.whatsapp.status !== "failed" && r.whatsapp.status !== "pending" && r.whatsapp.status !== "sending") {
          return false;
        }
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(query) ||
          (r.email && r.email.toLowerCase().includes(query)) ||
          (r.whatsapp?.phone && r.whatsapp.phone.includes(query))
        );
      }
      return true;
    });
  }, [announcement, filter, search]);

  if (!announcement) return null;

  const waSummary = announcement.whatsappSummary;
  const waFailedOrPending =
    (waSummary?.failed ?? 0) + (waSummary?.pending ?? 0) + (waSummary?.sending ?? 0);

  function handleRetrySingle(logId: string) {
    setRetryingLogId(logId);
    startRetrying(async () => {
      const res = await retryAnnouncementSingleWhatsAppAction(logId);
      if (res.ok) {
        toast.success("Mensagem reenviada com sucesso!");
      } else {
        toast.error(res.error || "Não foi possível reenviar a mensagem.");
      }
      setRetryingLogId(null);
    });
  }

  function handleRetryAll() {
    startRetrying(async () => {
      const res = await retryAnnouncementWhatsAppAction(
        announcement?.batchId ?? undefined,
      );
      if (res.ok) {
        toast.success(`Reenvio acionado para as mensagens pendentes.`);
      } else {
        toast.error(res.error || "Não foi possível acionar o reenvio.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
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
            <p className="max-h-[20vh] overflow-y-auto text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text">
              {announcement.body}
            </p>
          </div>
        ) : null}

        {/* Delivery metrics and actions */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/5 text-xs text-primary"
              >
                <CheckCheckIcon className="size-3" />
                <span>
                  App: {announcement.readRecipients} de{" "}
                  {announcement.totalRecipients} lidos
                </span>
              </Badge>

              {waSummary && waSummary.total > 0 && (
                <>
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    <MessageSquareIcon className="size-3" />
                    <span>
                      WhatsApp: {waSummary.delivered + waSummary.read} de{" "}
                      {waSummary.total} entregues
                    </span>
                  </Badge>

                  {waFailedOrPending > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-destructive/30 text-xs text-destructive bg-destructive/5"
                    >
                      <AlertCircleIcon className="size-3" />
                      <span>{waFailedOrPending} pendente(s)/falha(s)</span>
                    </Badge>
                  )}
                </>
              )}
            </div>

            {canRetry && waFailedOrPending > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryAll}
                disabled={isRetrying}
                className="h-8 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {isRetrying ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcwIcon className="size-3.5" />
                )}
                Reenviar falhas no WhatsApp
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) =>
                setFilter(v as "all" | "read" | "unread" | "wa_ok" | "wa_pending")
              }
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2.5">
                  Todos ({announcement.totalRecipients})
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs px-2.5">
                  Lidos no App ({announcement.readRecipients})
                </TabsTrigger>
                {waSummary && waSummary.total > 0 && (
                  <>
                    <TabsTrigger value="wa_ok" className="text-xs px-2.5">
                      WhatsApp OK ({waSummary.delivered + waSummary.read})
                    </TabsTrigger>
                    {waFailedOrPending > 0 && (
                      <TabsTrigger
                        value="wa_pending"
                        className="text-xs px-2.5 text-destructive"
                      >
                        WhatsApp Fila/Falhas ({waFailedOrPending})
                      </TabsTrigger>
                    )}
                  </>
                )}
              </TabsList>
            </Tabs>

            <div className="relative max-w-xs flex-1">
              <SearchIcon className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="max-h-[35vh] divide-y divide-border/40 overflow-y-auto rounded-xl border border-border/60">
            {filteredRecipients.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Nenhum destinatário encontrado neste filtro.
              </div>
            ) : (
              filteredRecipients.map((recipient) => {
                const isSingleRetrying =
                  isRetrying &&
                  retryingLogId === recipient.whatsapp?.logId;

                return (
                  <div
                    key={recipient.userId || recipient.personId || recipient.whatsapp?.phone}
                    className="flex flex-col gap-2 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-7">
                        {recipient.image ? (
                          <AvatarImage
                            src={recipient.image}
                            alt={recipient.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {getInitials(recipient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {recipient.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {recipient.email && (
                            <span className="truncate">{recipient.email}</span>
                          )}
                          {recipient.whatsapp?.phone && (
                            <span className="font-mono">
                              {recipient.whatsapp.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {/* App read status */}
                      {recipient.readAt ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCheckIcon className="size-3.5" />
                          <span>Lido no App</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ClockIcon className="size-3.5" />
                          <span>Aguardando App</span>
                        </span>
                      )}

                      {/* WhatsApp status */}
                      {recipient.whatsapp && (
                        <div className="flex items-center gap-1.5 pl-2 border-l">
                          {recipient.whatsapp.status === "read" && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 gap-1 text-[10px] font-normal">
                              <CheckCheckIcon className="size-3" />
                              Lido WhatsApp
                            </Badge>
                          )}

                          {recipient.whatsapp.status === "delivered" && (
                            <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 gap-1 text-[10px] font-normal">
                              <CheckIcon className="size-3" />
                              Entregue
                            </Badge>
                          )}

                          {recipient.whatsapp.status === "sent" && (
                            <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
                              <SendIcon className="size-3" />
                              Enviado
                            </Badge>
                          )}

                          {recipient.whatsapp.status === "sending" && (
                            <Badge variant="outline" className="gap-1 text-[10px] font-normal text-blue-600">
                              <Loader2Icon className="size-3 animate-spin" />
                              Enviando...
                            </Badge>
                          )}

                          {recipient.whatsapp.status === "pending" && (
                            <Badge variant="outline" className="gap-1 text-[10px] font-normal border-amber-500/30 text-amber-600 bg-amber-500/5">
                              <ClockIcon className="size-3" />
                              Na fila
                            </Badge>
                          )}

                          {recipient.whatsapp.status === "failed" && (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="destructive"
                                className="gap-1 text-[10px] font-normal"
                                title={recipient.whatsapp.lastError || "Falha no envio"}
                              >
                                <XCircleIcon className="size-3" />
                                Falha
                              </Badge>
                              {canRetry && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleRetrySingle(
                                      recipient.whatsapp!.logId,
                                    )
                                  }
                                  disabled={isSingleRetrying}
                                  className="h-6 px-1.5 text-[10px] gap-1"
                                >
                                  {isSingleRetrying ? (
                                    <Loader2Icon className="size-2.5 animate-spin" />
                                  ) : (
                                    <RotateCcwIcon className="size-2.5" />
                                  )}
                                  Reenviar
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

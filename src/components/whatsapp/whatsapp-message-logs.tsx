"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  Loader2Icon,
  MessageSquareIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  getEvolutionMessageLogsAction,
  retryAllFailedEvolutionMessagesAction,
  retryEvolutionMessageAction,
} from "@/app/actions/settings";
import type { EvolutionMessageLogItem } from "@/lib/notification-service";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function typeBadge(type: string) {
  switch (type) {
    case "announcement":
      return <Badge variant="secondary" className="text-[10px]">Aviso</Badge>;
    case "assignment":
      return <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Escala</Badge>;
    case "welcome":
      return <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">Boas-vindas</Badge>;
    case "monthly_availability":
      return <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600">Disponibilidade</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{type}</Badge>;
  }
}

function statusBadge(status: EvolutionMessageLogItem["status"], lastError?: string | null) {
  switch (status) {
    case "read":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 gap-1 text-[11px] font-normal hover:bg-emerald-500/20">
          <CheckCheckIcon className="size-3" />
          Lido
        </Badge>
      );
    case "delivered":
      return (
        <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-400 gap-1 text-[11px] font-normal hover:bg-teal-500/20">
          <CheckIcon className="size-3" />
          Entregue
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
          <SendIcon className="size-3" />
          Enviado
        </Badge>
      );
    case "sending":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-normal text-blue-600 dark:text-blue-400">
          <Loader2Icon className="size-3 animate-spin" />
          Enviando...
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="gap-1 text-[11px] font-normal border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5">
          <ClockIcon className="size-3" />
          Pendente na fila
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] font-normal" title={lastError || "Falha no envio"}>
          <XCircleIcon className="size-3" />
          Falha
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[11px]">{status}</Badge>;
  }
}

export function WhatsAppMessageLogsCard() {
  const [logs, setLogs] = useState<EvolutionMessageLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<EvolutionMessageLogItem | null>(null);

  const [isRetrying, startRetrying] = useTransition();
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvolutionMessageLogsAction({
        status: statusFilter,
        search: search.trim(),
        limit: 50,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      toast.error("Erro ao carregar histórico de mensagens.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    let ignore = false;
    getEvolutionMessageLogsAction({
      status: statusFilter,
      search: "",
      limit: 50,
    })
      .then((data) => {
        if (!ignore) {
          setLogs(data.logs);
          setTotal(data.total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Erro ao carregar histórico de mensagens.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadLogs();
  }

  function handleRetry(logId: string) {
    setRetryingLogId(logId);
    startRetrying(async () => {
      const res = await retryEvolutionMessageAction(logId);
      if (res.ok) {
        toast.success("Mensagem reenviada com sucesso!");
        await loadLogs();
      } else {
        toast.error(res.error || "Não foi possível reenviar a mensagem.");
      }
      setRetryingLogId(null);
    });
  }

  function handleRetryAll() {
    startRetrying(async () => {
      const res = await retryAllFailedEvolutionMessagesAction();
      toast.success(
        `Reprocessamento concluído: ${res.sent} enviada(s), ${res.failed} falha(s).`,
      );
      await loadLogs();
    });
  }

  const failedCount = logs.filter(
    (l) => l.status === "failed" || l.status === "pending",
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <MessageSquareIcon className="size-4" />
              </span>
              <CardTitle className="font-heading text-xl tracking-tight">
                Histórico de Mensagens do WhatsApp
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Histórico em tempo real de mensagens disparadas via WhatsApp com
              controle de fila e confirmações de entrega.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {failedCount > 0 && (
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
                Reenviar pendentes/falhas ({failedCount})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCwIcon
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filters and search row */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-sm"
          >
            <SearchIcon className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs font-mono"
            />
          </form>

          <div className="w-48">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs [&_select]:h-8 [&_select]:text-xs"
            >
              <NativeSelectOption value="all">Todos os status</NativeSelectOption>
              <NativeSelectOption value="pending">⏳ Pendentes na fila</NativeSelectOption>
              <NativeSelectOption value="sent">📤 Enviados</NativeSelectOption>
              <NativeSelectOption value="delivered">📨 Entregues</NativeSelectOption>
              <NativeSelectOption value="read">👁️ Lidos</NativeSelectOption>
              <NativeSelectOption value="failed">❌ Falhas</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground text-xs gap-2">
            <Loader2Icon className="size-5 animate-spin text-primary" />
            <span>Carregando registros...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              Nenhuma mensagem encontrada
            </p>
            <p>
              As mensagens disparadas pelo aplicativo aparecerão aqui com status de
              entrega e confirmação de leitura.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Destinatário</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Mensagem</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Data</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => {
                  const isCurrentRetrying =
                    isRetrying && retryingLogId === log.id;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium text-foreground truncate max-w-[150px]">
                          {log.recipientName || "Membro"}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {log.recipientPhone}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {typeBadge(log.type)}
                      </td>

                      <td className="p-3 max-w-[280px]">
                        <p className="truncate text-muted-foreground font-mono text-[11px]">
                          {log.content}
                        </p>
                        {log.lastError && (
                          <p className="text-[10px] text-destructive truncate flex items-center gap-1 mt-0.5">
                            <AlertCircleIcon className="size-3 shrink-0" />
                            {log.lastError}
                          </p>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {statusBadge(log.status, log.lastError)}
                      </td>

                      <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                        <div>{formatDateTime(log.createdAt)}</div>
                        {log.readAt && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            Lido: {formatDateTime(log.readAt)}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setSelectedLog(log)}
                            title="Ver mensagem completa"
                            className="h-7 w-7"
                          >
                            <EyeIcon className="size-3.5" />
                          </Button>

                          {(log.status === "failed" ||
                            log.status === "pending") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(log.id)}
                              disabled={isCurrentRetrying}
                              className="h-7 text-[11px] gap-1 px-2"
                            >
                              {isCurrentRetrying ? (
                                <Loader2Icon className="size-3 animate-spin" />
                              ) : (
                                <RotateCcwIcon className="size-3" />
                              )}
                              Reenviar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 text-[11px] text-muted-foreground">
          <span>
            Mostrando {logs.length} de {total} registros
          </span>
          <span>Atualizado automaticamente pelo Webhook Evolution</span>
        </div>
      </CardContent>

      {/* Detail Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <MessageSquareIcon className="size-4" />
              </span>
              <div>
                <DialogTitle className="font-heading text-lg">
                  Mensagem WhatsApp
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Para: {selectedLog?.recipientName} ({selectedLog?.recipientPhone})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
              <span className="text-muted-foreground">Status atual:</span>
              {selectedLog && statusBadge(selectedLog.status, selectedLog.lastError)}
            </div>

            {selectedLog?.evolutionMessageId && (
              <div className="rounded-lg border bg-muted/30 p-2.5 space-y-0.5">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                  ID Evolution WhatsApp:
                </span>
                <p className="font-mono text-[11px] break-all select-all">
                  {selectedLog.evolutionMessageId}
                </p>
              </div>
            )}

            {selectedLog?.lastError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-destructive space-y-0.5">
                <span className="text-[10px] uppercase font-semibold flex items-center gap-1">
                  <AlertCircleIcon className="size-3" />
                  Erro reportado:
                </span>
                <p className="font-mono text-[11px]">{selectedLog.lastError}</p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                Conteúdo do texto:
              </span>
              <div className="max-h-[30vh] overflow-y-auto rounded-xl border bg-card p-3 whitespace-pre-wrap font-mono text-xs select-text">
                {selectedLog?.content}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
              <div>Criado em: {formatDateTime(selectedLog?.createdAt ?? null)}</div>
              <div>Entregue em: {formatDateTime(selectedLog?.deliveredAt ?? null)}</div>
              <div>Tentativas: {selectedLog?.attempts}</div>
              <div>Lido em: {formatDateTime(selectedLog?.readAt ?? null)}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export const EvolutionMessageLogsCard = WhatsAppMessageLogsCard;

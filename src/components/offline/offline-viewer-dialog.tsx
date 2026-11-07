"use client";

import { useState } from "react";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadCloudIcon,
  PhoneIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OfflinePayload } from "@/lib/offline-types";
import { cn } from "@/lib/utils";

export function OfflineViewerDialog({
  offlineData,
  isOnline,
  isSyncing,
  onSync,
  trigger,
}: {
  offlineData: OfflinePayload | null;
  isOnline: boolean;
  isSyncing: boolean;
  onSync?: () => Promise<boolean>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  const syncedDate = offlineData
    ? new Date(offlineData.syncedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const roleLabel =
    offlineData?.roleLevel === "admin"
      ? "Administrador / Pastor"
      : offlineData?.roleLevel === "leader"
        ? "Líder de Ministério"
        : "Membro da Igreja";

  const ordersOfService = offlineData?.ordersOfService ?? [];
  const currentOrder = ordersOfService[selectedEventIndex] ?? ordersOfService[0];

  const fullSchedules = offlineData?.fullSchedules ?? [];
  const currentSchedule = fullSchedules[selectedEventIndex] ?? fullSchedules[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <WifiOffIcon className="size-4 text-amber-600" />
            Dados Offline
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <WifiOffIcon className="size-5" />
              </span>
              <div>
                <DialogTitle className="font-heading text-xl tracking-tight">
                  Central de Acesso Offline
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Consulte cronogramas e escalas mesmo sem internet no templo.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[0.68rem] font-normal",
                  isOnline
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                )}
              >
                {isOnline ? "Online" : "Modo Offline"}
              </Badge>

              {onSync && isOnline ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onSync()}
                  disabled={isSyncing}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <RefreshCwIcon
                    className={cn("size-3.5", isSyncing && "animate-spin")}
                  />
                  <span>Sincronizar</span>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[0.72rem] text-muted-foreground">
            <span>
              Nível: <strong className="text-foreground">{roleLabel}</strong>
            </span>
            {syncedDate ? (
              <span>Última atualização: {syncedDate}</span>
            ) : (
              <span className="text-amber-600">Nenhum dado salvo ainda</span>
            )}
          </div>
        </DialogHeader>

        {!offlineData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <DownloadCloudIcon className="size-6" />
            </span>
            <div className="space-y-1 max-w-sm">
              <p className="font-medium text-sm">Nenhum dado baixado</p>
              <p className="text-xs text-muted-foreground">
                Conecte-se à internet para sincronizar suas escalas e cronogramas automaticamente no aparelho.
              </p>
            </div>
            {onSync && isOnline ? (
              <Button size="sm" onClick={() => void onSync()} disabled={isSyncing} className="mt-2">
                <RefreshCwIcon className={cn("size-3.5 mr-1.5", isSyncing && "animate-spin")} />
                Baixar Dados Agora
              </Button>
            ) : null}
          </div>
        ) : (
          <Tabs defaultValue="assignments" className="w-full space-y-4 pt-2">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 gap-1">
              <TabsTrigger value="assignments" className="text-xs py-1.5">
                Minhas Escalas ({offlineData.myAssignments.length})
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="text-xs py-1.5"
                disabled={offlineData.ordersOfService.length === 0}
              >
                Cronogramas ({offlineData.ordersOfService.length})
              </TabsTrigger>
              <TabsTrigger
                value="schedules"
                className="text-xs py-1.5"
                disabled={offlineData.fullSchedules.length === 0}
              >
                Equipes ({offlineData.fullSchedules.length})
              </TabsTrigger>
              <TabsTrigger
                value="contacts"
                className="text-xs py-1.5"
                disabled={offlineData.emergencyContacts.length === 0}
              >
                Contatos ({offlineData.emergencyContacts.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Minhas Escalas */}
            <TabsContent value="assignments" className="space-y-3">
              {offlineData.myAssignments.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                  Você não possui escalas agendadas para os próximos cultos no cache.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {offlineData.myAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[0.65rem] font-medium">
                            {assignment.departmentName}
                          </Badge>
                          <span className="text-xs font-semibold text-primary">
                            {assignment.functionName}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {assignment.eventTitle}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="size-3.5" />
                            {assignment.formattedDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3.5" />
                            {assignment.formattedTime}
                          </span>
                        </div>
                      </div>
                      <Badge className="self-start sm:self-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-normal text-[0.65rem]">
                        <CheckCircle2Icon className="size-3 mr-1" />
                        Escalado
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Ordem do Culto (Cronograma Litúrgico) */}
            <TabsContent value="orders" className="space-y-3">
              {ordersOfService.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {ordersOfService.map((order, idx) => (
                    <button
                      key={order.eventId}
                      type="button"
                      onClick={() => setSelectedEventIndex(idx)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                        selectedEventIndex === idx
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border/60 hover:bg-muted/80",
                      )}
                    >
                      {order.eventTitle} ({order.formattedDate.split(",")[0]})
                    </button>
                  ))}
                </div>
              ) : null}

              {currentOrder ? (
                <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
                  <div className="border-b bg-muted/40 p-3.5">
                    <h3 className="font-heading text-base font-semibold">
                      {currentOrder.eventTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentOrder.formattedDate} • {currentOrder.formattedTime}
                    </p>
                  </div>

                  <div className="divide-y max-h-[50vh] overflow-y-auto">
                    {currentOrder.items.length === 0 ? (
                      <p className="p-6 text-center text-xs text-muted-foreground">
                        Nenhum momento cadastrado no cronograma deste culto.
                      </p>
                    ) : (
                      currentOrder.items.map((item) => {
                        const isHeader = item.type === "header";

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 text-xs flex items-start gap-3",
                              isHeader && "bg-muted/60 font-semibold uppercase tracking-wider text-[0.68rem] text-primary",
                            )}
                          >
                            {!isHeader ? (
                              <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded bg-secondary px-1 py-0.5 text-center font-mono text-[0.68rem] font-bold">
                                {item.startTime}
                              </div>
                            ) : null}

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="font-medium text-foreground">
                                {item.title}
                              </p>
                              {item.description ? (
                                <p className="text-[0.68rem] text-muted-foreground">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>

                            {!isHeader && (
                              <div className="text-right shrink-0">
                                {item.durationMinutes > 0 ? (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground font-mono">
                                    {item.durationMinutes} min
                                  </span>
                                ) : null}
                                {item.responsibleName ? (
                                  <p className="text-[0.65rem] font-medium text-primary truncate max-w-[100px] mt-0.5">
                                    {item.responsibleName}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Nenhum cronograma disponível.
                </p>
              )}
            </TabsContent>

            {/* TAB 3: Equipe & Escalas Completas */}
            <TabsContent value="schedules" className="space-y-3">
              {currentSchedule ? (
                <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
                  <div className="border-b bg-muted/40 p-3.5">
                    <h3 className="font-heading text-base font-semibold">
                      {currentSchedule.eventTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentSchedule.formattedDate} • {currentSchedule.roster.length} voluntários escalados
                    </p>
                  </div>

                  <div className="divide-y max-h-[50vh] overflow-y-auto">
                    {currentSchedule.roster.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">
                            {member.personName}
                          </p>
                          <p className="text-[0.68rem] text-muted-foreground">
                            {member.departmentName} &bull;{" "}
                            <span className="font-medium text-foreground/80">
                              {member.functionName}
                            </span>
                          </p>
                        </div>

                        {member.personPhone ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[0.68rem] gap-1"
                          >
                            <a href={`tel:${member.personPhone}`}>
                              <PhoneIcon className="size-3 text-emerald-600" />
                              Ligar
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Nenhuma escala de equipe cadastrada.
                </p>
              )}
            </TabsContent>

            {/* TAB 4: Contatos de Emergência */}
            <TabsContent value="contacts" className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Telefones dos líderes e equipe para ligações diretas pela rede telefônica convencional:
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {offlineData.emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {contact.name}
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground">
                        {contact.departmentName ?? contact.role}
                      </p>
                    </div>

                    {contact.phone ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      >
                        <a href={`tel:${contact.phone}`}>
                          <PhoneIcon className="size-3.5" />
                          <span>{contact.phone}</span>
                        </a>
                      </Button>
                    ) : (
                      <span className="text-[0.68rem] text-muted-foreground italic">
                        Sem telefone
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

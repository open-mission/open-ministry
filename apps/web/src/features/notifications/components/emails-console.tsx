"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  EyeIcon,
  FileTextIcon,
  KeyRoundIcon,
  LaptopIcon,
  MailIcon,
  MegaphoneIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  SparklesIcon,
  UserCheckIcon,
  UserPlusIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  listEmailLogsAction,
  resendEmailAction,
  sendTestEmailAction,
  getTemplatePreviewAction,
  type EmailLogItem,
  type EmailStats,
} from "@/app/actions/emails";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmailTemplateKey } from "@/lib/email/templates";

export type EmailsConsoleProps = {
  initialLogs: EmailLogItem[];
  initialStats: EmailStats;
  churchName: string;
  userEmail: string;
};

type TemplateCardInfo = {
  key: EmailTemplateKey;
  name: string;
  category: "auth" | "escala" | "comunicacao";
  categoryLabel: string;
  description: string;
  defaultSubject: string;
  icon: typeof MailIcon;
};

const TEMPLATE_CARDS: TemplateCardInfo[] = [
  {
    key: "welcome",
    name: "Boas-vindas (Novo Usuário)",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Enviado automaticamente quando uma nova pessoa cria sua conta no OpenMinistry.",
    defaultSubject: "Bem-vindo ao OpenMinistry 👋",
    icon: UserPlusIcon,
  },
  {
    key: "assignment",
    name: "Nova Escala de Culto",
    category: "escala",
    categoryLabel: "Escalas",
    description:
      "Notificação enviada ao voluntário quando ele é escalado em um culto ou evento.",
    defaultSubject: "Você foi escalado(a) no Culto de Celebração",
    icon: CalendarDaysIcon,
  },
  {
    key: "announcement",
    name: "Aviso da Igreja",
    category: "comunicacao",
    categoryLabel: "Comunicação",
    description:
      "Comunicado geral ou ministerial publicado pela liderança da igreja.",
    defaultSubject: "Comunicado oficial da igreja",
    icon: MegaphoneIcon,
  },
  {
    key: "reset_password",
    name: "Redefinição de Senha",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Enviado com link seguro temporário para troca ou recuperação de senha.",
    defaultSubject: "Redefinição de senha do OpenMinistry",
    icon: KeyRoundIcon,
  },
  {
    key: "magic_link",
    name: "Link Mágico (Acesso Direto)",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Permite login instantâneo e seguro sem necessidade de senha.",
    defaultSubject: "Seu link de acesso ao OpenMinistry",
    icon: SparklesIcon,
  },
  {
    key: "email_verification",
    name: "Confirmação de Email",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Confirma a propriedade do email cadastrado para ativar todos os recursos.",
    defaultSubject: "Confirme seu endereço de email",
    icon: UserCheckIcon,
  },
];

export function EmailsConsole({
  initialLogs,
  initialStats,
  churchName,
  userEmail,
}: EmailsConsoleProps) {
  const [logs, setLogs] = useState<EmailLogItem[]>(initialLogs);
  const [stats, setStats] = useState<EmailStats>(initialStats);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // Preview Dialog State
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);

  // Template Preview Dialog State
  const [templatePreview, setTemplatePreview] = useState<{
    open: boolean;
    templateKey: EmailTemplateKey | null;
    html: string;
    subject: string;
    previewMode: "desktop" | "mobile";
    loading: boolean;
  }>({
    open: false,
    templateKey: null,
    html: "",
    subject: "",
    previewMode: "desktop",
    loading: false,
  });

  // Test Email Dialog State
  const [testEmailDialog, setTestEmailDialog] = useState<{
    open: boolean;
    templateKey: EmailTemplateKey | null;
    templateName: string;
    targetEmail: string;
    loading: boolean;
  }>({
    open: false,
    templateKey: null,
    templateName: "",
    targetEmail: userEmail,
    loading: false,
  });

  // Reload logs
  function handleRefreshLogs() {
    startTransition(async () => {
      const res = await listEmailLogsAction({
        search: search.trim() || undefined,
        status: statusFilter,
        type: typeFilter,
      });

      if (res.ok) {
        setLogs(res.logs);
        setStats(res.stats);
        toast.success("Histórico de emails atualizado.");
      } else {
        toast.error(res.error || "Não foi possível carregar os emails.");
      }
    });
  }

  // Resend email
  function handleResend(log: EmailLogItem) {
    startTransition(async () => {
      const res = await resendEmailAction(log.id);
      if (res.ok) {
        toast.success(`Email reenviado com sucesso para ${log.recipientEmail}!`);
        const updated = await listEmailLogsAction({
          search: search.trim() || undefined,
          status: statusFilter,
          type: typeFilter,
        });
        if (updated.ok) {
          setLogs(updated.logs);
          setStats(updated.stats);
        }
      } else {
        toast.error(res.error || "Erro ao reenviar email.");
      }
    });
  }

  // Open Template Live Preview
  function handleOpenTemplatePreview(key: EmailTemplateKey) {
    setTemplatePreview({
      open: true,
      templateKey: key,
      html: "",
      subject: "",
      previewMode: "desktop",
      loading: true,
    });

    startTransition(async () => {
      const res = await getTemplatePreviewAction(key, { churchName });
      if (res.ok) {
        setTemplatePreview((prev) => ({
          ...prev,
          html: res.html,
          subject: res.subject,
          loading: false,
        }));
      } else {
        toast.error(res.error || "Erro ao gerar prévia do modelo.");
        setTemplatePreview((prev) => ({ ...prev, loading: false }));
      }
    });
  }

  // Send Test Email via Brevo
  async function handleSendTestEmail() {
    if (!testEmailDialog.templateKey || !testEmailDialog.targetEmail) {
      toast.error("Informe um email destinatário.");
      return;
    }

    setTestEmailDialog((prev) => ({ ...prev, loading: true }));
    try {
      const res = await sendTestEmailAction(
        testEmailDialog.templateKey,
        testEmailDialog.targetEmail,
      );

      if (res.ok) {
        toast.success(
          `Email de teste enviado com sucesso para ${testEmailDialog.targetEmail}!`,
        );
        setTestEmailDialog((prev) => ({ ...prev, open: false, loading: false }));
        handleRefreshLogs();
      } else {
        toast.error(res.error || "Falha ao enviar email de teste.");
        setTestEmailDialog((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      toast.error("Erro inesperado ao enviar teste.");
      setTestEmailDialog((prev) => ({ ...prev, loading: false }));
    }
  }

  // Client-side quick filter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && log.type !== typeFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesEmail = log.recipientEmail.toLowerCase().includes(q);
        const matchesName = (log.recipientName || "").toLowerCase().includes(q);
        const matchesSubject = log.subject.toLowerCase().includes(q);
        if (!matchesEmail && !matchesName && !matchesSubject) {
          return false;
        }
      }
      return true;
    });
  }, [logs, search, statusFilter, typeFilter]);

  const deliveryRate =
    stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total disparados
            </span>
            <MailIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.total}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Emails transacionais e avisos
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Entregues
            </span>
            <CheckCircle2Icon className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.sent}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Aceitos pela API Brevo
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Falhas
            </span>
            <XCircleIcon className="size-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {stats.failed}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Erros de envio ou rejeições
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Taxa de sucesso
            </span>
            <SparklesIcon className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-primary">
            {deliveryRate}%
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Entregabilidade geral
          </p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="history" className="w-full space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:w-[380px]">
          <TabsTrigger value="history" className="gap-2">
            <FileTextIcon className="size-4" />
            <span>Emails Enviados</span>
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {logs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <SparklesIcon className="size-4" />
            <span>Modelos (Templates)</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Histórico */}
        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Histórico de Disparos</CardTitle>
                  <CardDescription className="text-xs">
                    Registro detalhado de cada email transacional enviado pelo Brevo.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshLogs}
                  disabled={isPending}
                  className="h-8 gap-1.5 text-xs self-start sm:self-auto"
                >
                  <RefreshCwIcon
                    className={`size-3.5 ${isPending ? "animate-spin" : ""}`}
                  />
                  <span>Atualizar</span>
                </Button>
              </div>

              {/* Filtros */}
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                <div className="relative sm:col-span-6">
                  <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por destinatário ou assunto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <NativeSelect
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as "all" | "sent" | "failed")
                    }
                    className="h-8 text-xs"
                  >
                    <NativeSelectOption value="all">
                      Todos os status
                    </NativeSelectOption>
                    <NativeSelectOption value="sent">
                      Enviados com sucesso
                    </NativeSelectOption>
                    <NativeSelectOption value="failed">
                      Falhas de envio
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="sm:col-span-3">
                  <NativeSelect
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <NativeSelectOption value="all">
                      Todos os tipos
                    </NativeSelectOption>
                    <NativeSelectOption value="assignment">
                      Escalas de Culto
                    </NativeSelectOption>
                    <NativeSelectOption value="announcement">
                      Avisos da Igreja
                    </NativeSelectOption>
                    <NativeSelectOption value="welcome">
                      Boas-vindas
                    </NativeSelectOption>
                    <NativeSelectOption value="reset_password">
                      Redefinição de Senha
                    </NativeSelectOption>
                    <NativeSelectOption value="magic_link">
                      Link Mágico
                    </NativeSelectOption>
                    <NativeSelectOption value="email_verification">
                      Verificação
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <MailIcon className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">
                    Nenhum email encontrado
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                    {search || statusFilter !== "all" || typeFilter !== "all"
                      ? "Nenhum disparo corresponde aos filtros aplicados. Tente ajustar os termos."
                      : "Nenhum email transacional foi registrado ainda nesta comunidade."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Destinatário</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead className="w-[120px]">Tipo</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[140px]">Data & Hora</TableHead>
                        <TableHead className="w-[110px] text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const isSent = log.status === "sent";

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="truncate text-xs font-semibold text-foreground">
                                  {log.recipientName || "Membro"}
                                </span>
                                <span className="truncate text-[11px] text-muted-foreground">
                                  {log.recipientEmail}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="line-clamp-1 text-xs text-foreground">
                                {log.subject}
                              </span>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize px-1.5 py-0"
                              >
                                {formatTypeName(log.type)}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              {isSent ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                >
                                  <CheckCircle2Icon className="size-3" />
                                  <span>Enviado</span>
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="gap-1 text-[10px] px-1.5 py-0"
                                >
                                  <XCircleIcon className="size-3" />
                                  <span>Falhou</span>
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-[11px] text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => setSelectedLog(log)}
                                  title="Visualizar email enviado"
                                >
                                  <EyeIcon className="size-3.5 text-muted-foreground" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleResend(log)}
                                  disabled={isPending}
                                  title="Reenviar este email"
                                >
                                  <RefreshCwIcon className="size-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Modelos (Templates) */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Modelos de Email Padronizados
              </h3>
              <p className="text-xs text-muted-foreground">
                Desenvolvidos em React Email, responsivos e otimizados para clientes
                como Gmail, Apple Mail e Outlook via Brevo.
              </p>
            </div>
            <Badge variant="outline" className="text-xs gap-1 py-1">
              <SparklesIcon className="size-3 text-primary" />
              <span>@react-email/components</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_CARDS.map((tpl) => {
              const Icon = tpl.icon;

              return (
                <Card
                  key={tpl.key}
                  className="flex flex-col justify-between border-border/80 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {tpl.categoryLabel}
                      </Badge>
                    </div>

                    <div>
                      <CardTitle className="text-base font-semibold leading-tight">
                        {tpl.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {tpl.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Assunto padrão:
                      </span>
                      <span className="line-clamp-1 italic">
                        &ldquo;{tpl.defaultSubject}&rdquo;
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTemplatePreview(tpl.key)}
                        className="flex-1 h-8 text-xs gap-1.5"
                      >
                        <EyeIcon className="size-3.5" />
                        <span>Visualizar</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setTestEmailDialog({
                            open: true,
                            templateKey: tpl.key,
                            templateName: tpl.name,
                            targetEmail: userEmail,
                            loading: false,
                          })
                        }
                        className="flex-1 h-8 text-xs gap-1.5"
                      >
                        <SendIcon className="size-3.5" />
                        <span>Testar</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Visualizar Log de Email Enviado */}
      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MailIcon className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {selectedLog?.subject}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Para: {selectedLog?.recipientName} ({selectedLog?.recipientEmail})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="flex-1 space-y-3 overflow-hidden flex flex-col min-h-0">
              {/* Metadados */}
              <div className="grid grid-cols-2 gap-2 text-[11px] rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground block">Tipo</span>
                  <span className="font-medium capitalize">
                    {formatTypeName(selectedLog.type)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <span
                    className={`font-semibold ${
                      selectedLog.status === "sent"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {selectedLog.status === "sent" ? "Enviado" : "Falhou"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Disparado em</span>
                  <span className="font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">ID Brevo</span>
                  <span className="font-mono text-[10px] truncate block" title={selectedLog.brevoMessageId || ""}>
                    {selectedLog.brevoMessageId || "—"}
                  </span>
                </div>
              </div>

              {selectedLog.lastError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
                  <ShieldAlertIcon className="size-4 shrink-0 mt-0.5" />
                  <span>{selectedLog.lastError}</span>
                </div>
              ) : null}

              {/* Sandboxed Iframe Preview */}
              <div className="flex-1 min-h-[350px] rounded-lg border overflow-hidden bg-white">
                <iframe
                  title="Conteúdo do Email"
                  srcDoc={selectedLog.htmlContent}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
              className="text-xs"
            >
              Fechar
            </Button>
            {selectedLog && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  handleResend(selectedLog);
                  setSelectedLog(null);
                }}
                disabled={isPending}
                className="gap-1.5 text-xs"
              >
                <RefreshCwIcon className="size-3.5" />
                <span>Reenviar agora</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Prévia ao vivo do Modelo React Email */}
      <Dialog
        open={templatePreview.open}
        onOpenChange={(open) =>
          setTemplatePreview((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <DialogTitle className="text-base font-semibold">
                  Prévia do Modelo
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {templatePreview.subject || "Carregando modelo..."}
                </DialogDescription>
              </div>

              {/* Desktop / Mobile Switcher */}
              <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
                <Button
                  variant={
                    templatePreview.previewMode === "desktop"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon-xs"
                  onClick={() =>
                    setTemplatePreview((prev) => ({
                      ...prev,
                      previewMode: "desktop",
                    }))
                  }
                  title="Tamanho Desktop"
                >
                  <LaptopIcon className="size-3.5" />
                </Button>
                <Button
                  variant={
                    templatePreview.previewMode === "mobile"
                      ? "secondary"
                      : "ghost"
                  }
                  size="icon-xs"
                  onClick={() =>
                    setTemplatePreview((prev) => ({
                      ...prev,
                      previewMode: "mobile",
                    }))
                  }
                  title="Tamanho Mobile"
                >
                  <SmartphoneIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[420px] rounded-lg border bg-muted/20 flex items-center justify-center overflow-auto p-4">
            {templatePreview.loading ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCwIcon className="size-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  Renderizando modelo com React Email...
                </span>
              </div>
            ) : (
              <div
                className={`transition-all duration-200 h-full rounded-xl shadow-lg border overflow-hidden bg-white ${
                  templatePreview.previewMode === "mobile"
                    ? "w-[380px]"
                    : "w-full max-w-[620px]"
                }`}
              >
                <iframe
                  title="Prévia do Modelo React Email"
                  srcDoc={templatePreview.html}
                  className="w-full h-full min-h-[460px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTemplatePreview((prev) => ({ ...prev, open: false }))
              }
              className="text-xs"
            >
              Fechar
            </Button>
            {templatePreview.templateKey && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const key = templatePreview.templateKey!;
                  setTemplatePreview((prev) => ({ ...prev, open: false }));
                  setTestEmailDialog({
                    open: true,
                    templateKey: key,
                    templateName: formatTypeName(key),
                    targetEmail: userEmail,
                    loading: false,
                  });
                }}
                className="gap-1.5 text-xs"
              >
                <SendIcon className="size-3.5" />
                <span>Enviar email de teste</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar Email de Teste */}
      <Dialog
        open={testEmailDialog.open}
        onOpenChange={(open) =>
          setTestEmailDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <SendIcon className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Enviar Email de Teste
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {testEmailDialog.templateName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              O email será processado pelo Brevo e entregue diretamente na sua
              caixa de entrada para você avaliar o layout final.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="test-email-target"
                className="text-xs font-semibold text-foreground"
              >
                Destinatário de teste
              </label>
              <Input
                id="test-email-target"
                type="email"
                placeholder="seu-email@exemplo.com"
                value={testEmailDialog.targetEmail}
                onChange={(e) =>
                  setTestEmailDialog((prev) => ({
                    ...prev,
                    targetEmail: e.target.value,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTestEmailDialog((prev) => ({ ...prev, open: false }))
              }
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSendTestEmail}
              disabled={testEmailDialog.loading}
              className="gap-1.5 text-xs"
            >
              {testEmailDialog.loading ? (
                <>
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                  <span>Enviando via Brevo...</span>
                </>
              ) : (
                <>
                  <SendIcon className="size-3.5" />
                  <span>Enviar teste agora</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTypeName(type: string): string {
  switch (type) {
    case "assignment":
      return "Escala de Culto";
    case "announcement":
      return "Aviso da Igreja";
    case "welcome":
      return "Boas-vindas";
    case "reset_password":
      return "Troca de Senha";
    case "magic_link":
      return "Link Mágico";
    case "email_verification":
      return "Confirmação";
    default:
      return type;
  }
}

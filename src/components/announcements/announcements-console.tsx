"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  BellIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClockIcon,
  InfoIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  SendIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  sendAnnouncementAction,
  type AnnouncementFormState,
} from "@/app/actions/notifications";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type AnnouncementDepartmentOption = {
  id: string;
  name: string;
};

export type AnnouncementPersonOption = {
  id: string;
  name: string;
  phone?: string | null;
  hasAccount?: boolean;
  departmentNames?: string[];
};

type AnnouncementsConsoleProps = {
  isAdmin: boolean;
  departments: AnnouncementDepartmentOption[];
  people: AnnouncementPersonOption[];
  isWhatsAppConfigured: boolean;
  churchName: string;
  currentUserName: string;
};

// Modelos prontos de aviso para agilizar o envio
const ANNOUNCEMENT_PRESETS = [
  {
    id: "general",
    label: "Comunicado Geral",
    icon: MegaphoneIcon,
    title: "Comunicado Importante da Liderança",
    body: "Olá a todos! Gostaríamos de compartilhar um comunicado importante sobre as atividades e programações da nossa comunidade nesta semana. Fiquem atentos às orientações e que Deus abençoe!",
  },
  {
    id: "schedule",
    label: "Escala do Final de Semana",
    icon: CheckCircle2Icon,
    title: "Confirmação de Escala do Domingo",
    body: "Atenção voluntários escalados para este domingo: por favor, confirmem sua presença no aplicativo ou avisem com antecedência caso necessitem de substituição. Contamos com vocês!",
  },
  {
    id: "rehearsal",
    label: "Ensaio e Reunião",
    icon: ClockIcon,
    title: "Lembrete: Ensaio e Alinhamento de Equipe",
    body: "Olá equipe! Nosso ensaio/reunião de alinhamento está confirmado. Pedimos que cheguem com 15 minutos de antecedência para oração inicial e organização dos materiais.",
  },
  {
    id: "urgent",
    label: "Aviso Urgente",
    icon: ShieldAlertIcon,
    title: "Aviso Urgente: Alteração no Cronograma",
    body: "Informamos que houve uma alteração importante de horário e programação no nosso encontro. Por favor, verifiquem o aplicativo para conferir todos os detalhes atualizados.",
  },
  {
    id: "gratitude",
    label: "Agradecimento",
    icon: SparklesIcon,
    title: "Agradecimento pelo Culto Abençoado",
    body: "Queremos agradecer de coração a cada irmão e voluntário pelo serviço e dedicação no último culto. O empenho de vocês fez toda a diferença na vida da igreja!",
  },
];

export function AnnouncementsConsole({
  isAdmin,
  departments,
  people,
  isWhatsAppConfigured,
  churchName,
  currentUserName,
}: AnnouncementsConsoleProps) {
  const [state, formAction] = useActionState<
    AnnouncementFormState,
    FormData
  >(sendAnnouncementAction, undefined);
  const handled = useRef(false);

  const [audienceType, setAudienceType] = useState<
    "all" | "department" | "person"
  >(isAdmin ? "all" : departments.length > 0 ? "department" : "person");

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments[0]?.id ?? "",
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    people[0]?.id ?? "",
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [sendInApp, setSendInApp] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(isWhatsAppConfigured);
  const [sendPush, setSendPush] = useState(true);

  const [previewTab, setPreviewTab] = useState<"app" | "push" | "whatsapp">(
    "app",
  );

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      const channels = [
        sendInApp && "App",
        sendPush && "Push",
        sendWhatsApp && "WhatsApp",
      ]
        .filter(Boolean)
        .join(", ");

      toast.success("Aviso enviado com sucesso!", {
        description: `Disparado via ${channels || "canais selecionados"}.`,
      });

      setTitle("");
      setBody("");
      setTimeout(() => {
        handled.current = false;
      }, 1000);
    }
  }, [state, sendInApp, sendPush, sendWhatsApp]);

  function applyPreset(presetId: string) {
    const preset = ANNOUNCEMENT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setTitle(preset.title);
      setBody(preset.body);
      toast.info(`Modelo "${preset.label}" aplicado no formulário.`);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Formulário Principal de Envio (7 colunas) */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-primary/20 shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MegaphoneIcon className="size-4" />
              </span>
              <div>
                <CardTitle className="font-heading text-xl tracking-tight">
                  Criar e Disparar Aviso
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAdmin
                    ? "Envie para toda a comunidade, departamentos ou membros específicos."
                    : "Envie comunicados para os integrantes dos seus departamentos."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Modelos Rápidos de Mensagem */}
            <div className="space-y-2 pb-5 border-b mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SparklesIcon className="size-3.5 text-primary" />
                  Modelos Rápidos (Presets)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Clique para preencher
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ANNOUNCEMENT_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset.id)}
                      className="h-7 text-xs gap-1.5 rounded-lg hover:border-primary hover:text-primary transition-all"
                    >
                      <Icon className="size-3" />
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <form action={formAction} className="space-y-5">
              <input type="hidden" name="audienceType" value={audienceType} />
              {sendInApp && <input type="hidden" name="sendInApp" value="true" />}
              {sendWhatsApp && (
                <input type="hidden" name="sendWhatsApp" value="true" />
              )}
              {sendPush && <input type="hidden" name="sendPush" value="true" />}

              {/* Seletor de Destinatário */}
              <FieldGroup className="space-y-3">
                <div>
                  <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Destinatário
                  </FieldLabel>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setAudienceType("all")}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                          audienceType === "all"
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs"
                            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <Building2Icon className="size-4 shrink-0" />
                        <span>Toda a igreja</span>
                      </button>
                    )}

                    {departments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAudienceType("department")}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                          audienceType === "department"
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs"
                            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <UsersIcon className="size-4 shrink-0" />
                        <span>Departamento</span>
                      </button>
                    )}

                    {people.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAudienceType("person")}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                          audienceType === "person"
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-xs"
                            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <UserIcon className="size-4 shrink-0" />
                        <span>Pessoa específica</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Seleção contextual de Departamento */}
                {audienceType === "department" && (
                  <Field data-invalid={Boolean(state?.fieldErrors?.departmentId)}>
                    <FieldLabel htmlFor="announcement-department">
                      Escolha o departamento
                    </FieldLabel>
                    <NativeSelect
                      id="announcement-department"
                      name="departmentId"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full [&_select]:h-10"
                      required
                    >
                      {departments.map((department) => (
                        <NativeSelectOption
                          key={department.id}
                          value={department.id}
                        >
                          {department.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError
                      errors={state?.fieldErrors?.departmentId?.map((message) => ({
                        message,
                      }))}
                    />
                  </Field>
                )}

                {/* Seleção contextual de Pessoa */}
                {audienceType === "person" && (
                  <Field data-invalid={Boolean(state?.fieldErrors?.personId)}>
                    <FieldLabel htmlFor="announcement-person">
                      Escolha a pessoa
                    </FieldLabel>
                    <NativeSelect
                      id="announcement-person"
                      name="personId"
                      value={selectedPersonId}
                      onChange={(e) => setSelectedPersonId(e.target.value)}
                      className="w-full [&_select]:h-10"
                      required
                    >
                      {people.map((p) => {
                        const depts = p.departmentNames?.length
                          ? ` (${p.departmentNames.join(", ")})`
                          : "";
                        const phoneBadge = p.phone ? " • WhatsApp" : "";
                        return (
                          <NativeSelectOption key={p.id} value={p.id}>
                            {p.name}
                            {depts}
                            {phoneBadge}
                          </NativeSelectOption>
                        );
                      })}
                    </NativeSelect>
                    <FieldError
                      errors={state?.fieldErrors?.personId?.map((message) => ({
                        message,
                      }))}
                    />
                  </Field>
                )}
              </FieldGroup>

              {/* Canais de Disparo Multicanal */}
              <div className="rounded-xl border bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Canais de Notificação
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Selecione os canais de envio
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Canal 1: App */}
                  <label
                    htmlFor="console-channel-in-app"
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                      sendInApp
                        ? "border-primary/50 bg-background shadow-xs"
                        : "border-border/60 bg-card/60 opacity-60"
                    }`}
                  >
                    <Checkbox
                      id="console-channel-in-app"
                      checked={sendInApp}
                      onCheckedChange={(checked) =>
                        setSendInApp(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <BellIcon className="size-3.5 text-primary" />
                        <span>No Aplicativo</span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] py-0 px-1"
                        >
                          Ativo
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Sino e central interna
                      </p>
                    </div>
                  </label>

                  {/* Canal 2: WhatsApp */}
                  <label
                    htmlFor="console-channel-whatsapp"
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                      sendWhatsApp
                        ? "border-emerald-500/50 bg-background shadow-xs"
                        : "border-border/60 bg-card/60 opacity-60"
                    }`}
                  >
                    <Checkbox
                      id="console-channel-whatsapp"
                      checked={sendWhatsApp}
                      onCheckedChange={(checked) =>
                        setSendWhatsApp(Boolean(checked))
                      }
                      className="mt-0.5 data-checked:border-emerald-600 data-checked:bg-emerald-600"
                    />
                    <div className="flex-1 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <MessageSquareIcon className="size-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                        <Badge
                          variant={isWhatsAppConfigured ? "secondary" : "outline"}
                          className={`ml-auto text-[10px] py-0 px-1 ${
                            isWhatsAppConfigured
                              ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isWhatsAppConfigured ? "Conectado" : "Evolution API"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {isWhatsAppConfigured
                          ? "Disparo direto no WhatsApp"
                          : "Requer WhatsApp configurado"}
                      </p>
                    </div>
                  </label>

                  {/* Canal 3: Push */}
                  <label
                    htmlFor="console-channel-push"
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                      sendPush
                        ? "border-primary/50 bg-background shadow-xs"
                        : "border-border/60 bg-card/60 opacity-60"
                    }`}
                  >
                    <Checkbox
                      id="console-channel-push"
                      checked={sendPush}
                      onCheckedChange={(checked) =>
                        setSendPush(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <SmartphoneIcon className="size-3.5 text-primary" />
                        <span>Push Mobile (PWA)</span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] py-0 px-1"
                        >
                          Ativo
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Notificação no celular e navegador
                      </p>
                    </div>
                  </label>

                  {/* Canal 4: E-mail (Futuramente) */}
                  <div className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5 opacity-60">
                    <Checkbox id="console-channel-email" disabled className="mt-0.5" />
                    <div className="flex-1 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <MailIcon className="size-3.5" />
                        <span>E-mail</span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] py-0 px-1 border-dashed"
                        >
                          Em breve
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 leading-snug">
                        Envio por correio eletrônico
                      </p>
                    </div>
                  </div>
                </div>

                {state?.fieldErrors?.channels ? (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.channels[0]}
                  </p>
                ) : null}
              </div>

              {/* Título e Mensagem */}
              <FieldGroup className="space-y-3">
                <Field data-invalid={Boolean(state?.fieldErrors?.title)}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="console-title">Título do aviso</FieldLabel>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {title.length}/80
                    </span>
                  </div>
                  <Input
                    id="console-title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Escala do Domingo ou Ensaio Geral"
                    className="h-10"
                    maxLength={80}
                    required
                  />
                  <FieldError
                    errors={state?.fieldErrors?.title?.map((message) => ({
                      message,
                    }))}
                  />
                </Field>

                <Field data-invalid={Boolean(state?.fieldErrors?.body)}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="console-body">Mensagem</FieldLabel>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {body.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="console-body"
                    name="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Escreva as instruções, orientações ou comunicado para a equipe..."
                    rows={4}
                    maxLength={500}
                    required
                  />
                  <FieldError
                    errors={state?.fieldErrors?.body?.map((message) => ({
                      message,
                    }))}
                  />
                </Field>
              </FieldGroup>

              {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

              {/* Confirmação explícita do destinatário para prevenir disparos acidentais */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span className="text-muted-foreground">Destinatário confirmado do envio:</span>
                <span className="font-semibold text-primary flex items-center gap-1.5">
                  {audienceType === "person" && <UserIcon className="size-3.5" />}
                  {audienceType === "department" && <UsersIcon className="size-3.5" />}
                  {audienceType === "all" && <Building2Icon className="size-3.5" />}
                  {audienceType === "person"
                    ? `1 pessoa: ${people.find((p) => p.id === selectedPersonId)?.name || "Pessoa selecionada"}`
                    : audienceType === "department"
                      ? `Departamento: ${departments.find((d) => d.id === selectedDeptId)?.name || "Departamento selecionado"}`
                      : "Toda a igreja (todos os membros)"}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <SubmitButton
                  className="h-10 gap-2"
                  pendingLabel="Disparando aviso..."
                >
                  <SendIcon className="size-4" />
                  Disparar comunicado
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Pré-visualização ao Vivo (5 colunas) */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="shadow-xs sticky top-24">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base tracking-tight flex items-center gap-2">
                <InfoIcon className="size-4 text-primary" />
                Prévia da Notificação
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                Simulador
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Veja como seu aviso chegará nos diferentes canais.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs
              value={previewTab}
              onValueChange={(v) => setPreviewTab(v as typeof previewTab)}
              className="space-y-3"
            >
              <TabsList className="grid grid-cols-3 h-8">
                <TabsTrigger value="app" className="text-xs">
                  No App
                </TabsTrigger>
                <TabsTrigger value="push" className="text-xs">
                  Push Celular
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs">
                  WhatsApp
                </TabsTrigger>
              </TabsList>

              {/* Prévia 1: No App */}
              <TabsContent value="app">
                <div className="rounded-xl border bg-accent/40 p-3.5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <BellIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {title || "Título do aviso"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {churchName} · Agora
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                    {body ||
                      "O conteúdo do aviso aparecerá aqui para os voluntários."}
                  </p>
                </div>
              </TabsContent>

              {/* Prévia 2: Push Mobile */}
              <TabsContent value="push">
                <div className="rounded-2xl border bg-black/90 text-white p-3.5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="size-2 rounded-full bg-primary" />
                      OpenMinistry · {churchName}
                    </span>
                    <span>agora</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      {title || "Título do aviso"}
                    </p>
                    <p className="text-[11px] text-white/80 leading-snug line-clamp-3">
                      {body || "Pré-visualização da notificação push no celular."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Prévia 3: WhatsApp */}
              <TabsContent value="whatsapp">
                <div className="rounded-2xl border bg-emerald-950/10 dark:bg-emerald-950/30 p-3.5 space-y-2">
                  <div className="rounded-xl bg-card border border-emerald-500/20 p-3 space-y-1 shadow-xs">
                    <p className="text-xs font-bold text-foreground">
                      🔔 *Aviso: {title || "Título do aviso"}*
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Igreja: *{churchName}* · Por: {currentUserName}
                    </p>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap pt-1">
                      {body || "Texto que será entregue via WhatsApp."}
                    </p>
                    <div className="flex justify-end pt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        12:00 ✓✓
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Dica de Boas Práticas */}
            <div className="rounded-xl border bg-muted/20 p-3 space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <SparklesIcon className="size-3 text-primary" />
                Dica da Comunidade
              </p>
              <p className="leading-relaxed text-[11px]">
                Avisos objetivos e com antecedência aumentam em mais de 70% o
                engajamento e a pontualidade dos voluntários nas escalas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

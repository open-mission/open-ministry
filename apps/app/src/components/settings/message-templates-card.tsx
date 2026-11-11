"use client";

import { useState, useRef, useTransition } from "react";
import {
  CheckCheckIcon,
  CheckIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  SendIcon,
  SmartphoneIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  saveMessageTemplateAction,
  resetMessageTemplateAction,
  sendTestTemplateMessageAction,
} from "@/app/actions/message-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  interpolateTemplate,
  type MessageTemplateType,
  type ResolvedTemplate,
  type TemplateVariable,
} from "@/lib/message-templates";

export function MessageTemplatesCard({
  initialTemplates,
  churchName,
}: {
  initialTemplates: ResolvedTemplate[];
  churchName: string;
}) {
  const [templates, setTemplates] = useState<ResolvedTemplate[]>(initialTemplates);
  const [activeType, setActiveType] = useState<MessageTemplateType>("invite_church");
  const [testPhone, setTestPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentTemplate =
    templates.find((t) => t.type === activeType) || templates[0];

  const [currentContent, setCurrentContent] = useState<string>(
    currentTemplate?.content || "",
  );

  // When switching active template, sync content
  const handleSelectTemplate = (type: MessageTemplateType) => {
    setActiveType(type);
    const selected = templates.find((t) => t.type === type);
    setCurrentContent(selected?.content || "");
  };

  // Insert a variable tag at current cursor position
  const handleInsertVariable = (variableKey: string) => {
    const textarea = textareaRef.current;
    const token = `{{${variableKey}}}`;

    if (!textarea) {
      setCurrentContent((prev) => prev + token);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + token + text.substring(end);
    setCurrentContent(newText);

    // Restore focus and cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  const handleSave = () => {
    if (!currentTemplate) return;

    startTransition(async () => {
      const res = await saveMessageTemplateAction({
        type: activeType,
        content: currentContent,
      });

      if (res.ok && res.template) {
        toast.success(`Modelo "${res.template.title}" salvo com sucesso!`);
        setTemplates((prev) =>
          prev.map((t) => (t.type === activeType ? res.template! : t)),
        );
      } else {
        toast.error(res.error || "Erro ao salvar modelo.");
      }
    });
  };

  const handleReset = () => {
    if (!currentTemplate) return;

    startTransition(async () => {
      const res = await resetMessageTemplateAction(activeType);

      if (res.ok && res.defaultContent) {
        setCurrentContent(res.defaultContent);
        toast.success("Modelo restaurado para o padrão do sistema.");
        setTemplates((prev) =>
          prev.map((t) =>
            t.type === activeType
              ? {
                  ...t,
                  content: res.defaultContent!,
                  isCustomized: false,
                }
              : t,
          ),
        );
      } else {
        toast.error(res.error || "Erro ao restaurar modelo.");
      }
    });
  };

  const handleSendTest = () => {
    if (!testPhone.trim()) {
      toast.error("Informe um número de WhatsApp com DDD para o teste.");
      return;
    }

    startTestTransition(async () => {
      const res = await sendTestTemplateMessageAction({
        type: activeType,
        recipientPhone: testPhone,
        customContent: currentContent,
      });

      if (res.ok) {
        toast.success("Mensagem de teste enviada com sucesso no WhatsApp!");
      } else {
        toast.error(res.error || "Erro ao enviar teste via WhatsApp.");
      }
    });
  };

  // Realistic sample data for the live simulator
  const sampleVariables: Record<string, string> = {
    name: "Gabriel Silva",
    church_name: churchName,
    link: "https://openministry.app/dashboard",
    church_phone: "+55 (11) 98765-4321",
    whatsapp_name: churchName,
    department_name: "Ministério de Louvor",
    role: "Membro",
    event_title: "Culto de Celebração",
    function_name: "Teclado / Voz",
    event_date: "Domingo, 15/11",
    event_time: "19h00",
    month_name: "Dezembro",
    title: "Ensaio Geral",
    body: "Lembramos a todos do ensaio neste sábado às 15h no templo.",
  };

  const simulatedText = interpolateTemplate(currentContent, sampleVariables);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquareIcon className="size-5" />
            </span>
            <div>
              <CardTitle className="font-heading text-xl tracking-tight">
                Modelos de Mensagens (WhatsApp)
              </CardTitle>
              <CardDescription>
                Personalize os textos automáticos com variáveis dinâmicas como nome, data e links.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Template Selector Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Selecione o Modelo para Editar
          </label>
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-muted/50 border">
            {templates.map((tpl) => {
              const isActive = tpl.type === activeType;
              return (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.type)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  <span>{tpl.title}</span>
                  {tpl.isCustomized ? (
                    <span className="size-1.5 rounded-full bg-primary" title="Personalizado" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Template Description */}
        {currentTemplate ? (
          <div className="flex items-center justify-between rounded-lg border bg-accent/20 px-4 py-2.5 text-xs text-muted-foreground">
            <p>{currentTemplate.description}</p>
            {currentTemplate.isCustomized ? (
              <Badge variant="secondary" className="text-[10px] shrink-0 ml-3">
                Personalizado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] shrink-0 ml-3">
                Padrão do Sistema
              </Badge>
            )}
          </div>
        ) : null}

        {/* Editor & Live WhatsApp Preview Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Editor & Variable Chips */}
          <div className="space-y-4">
            {/* Variable insertion buttons */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Clique nas variáveis para inserir no texto:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentTemplate?.variables.map((variable: TemplateVariable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => handleInsertVariable(variable.key)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-mono font-medium text-foreground shadow-2xs hover:bg-muted/80 hover:border-primary/50 transition-colors cursor-pointer"
                    title={`${variable.label}: ${variable.description} (ex: ${variable.example})`}
                  >
                    <span className="text-primary font-bold">+</span>
                    <span>{`{{${variable.key}}}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <Textarea
                ref={textareaRef}
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                rows={11}
                placeholder="Escreva a mensagem personalizada aqui..."
                className="font-mono text-xs leading-relaxed resize-y bg-background"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Dica: use <code className="font-semibold">*negrito*</code>,{" "}
                  <code className="font-semibold">_itálico_</code> ou emojis.
                </span>
                <span>{currentContent.length} caracteres</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={isPending || currentContent === currentTemplate?.content}
                className="gap-2"
                size="sm"
              >
                {isPending ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : (
                  <CheckIcon className="size-3.5" />
                )}
                Salvar Modelo
              </Button>

              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isPending || !currentTemplate?.isCustomized}
                className="gap-2 text-xs"
                size="sm"
              >
                <RefreshCwIcon className="size-3.5" />
                Restaurar Padrão
              </Button>
            </div>
          </div>

          {/* Right: Live WhatsApp Simulator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <SmartphoneIcon className="size-3.5 text-primary" />
                Pré-visualização no WhatsApp
              </span>
              <Badge variant="outline" className="text-[10px]">
                Tempo Real
              </Badge>
            </div>

            {/* WhatsApp Chat Bubble Mockup */}
            <div className="relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-[#E5DDD5] dark:bg-zinc-950 p-4 min-h-[300px] flex flex-col justify-end shadow-inner">
              {/* WhatsApp message balloon */}
              <div className="max-w-[92%] self-start rounded-2xl rounded-tl-xs bg-[#E7FFDB] dark:bg-[#005C4B] p-3.5 text-zinc-900 dark:text-zinc-100 shadow-xs space-y-2">
                <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans break-words">
                  {formatWhatsAppText(simulatedText)}
                </div>

                <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span>12:00</span>
                  <CheckCheckIcon className="size-3 text-[#53bdeb]" />
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Test Box */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <SendIcon className="size-3.5 text-primary" />
                Testar envio real pelo WhatsApp:
              </span>
              <div className="flex items-center gap-2">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="DDD + Número (ex: 11988887777)"
                  className="h-9 text-xs bg-background"
                />
                <Button
                  size="sm"
                  onClick={handleSendTest}
                  disabled={isTesting || !testPhone.trim()}
                  className="h-9 gap-1.5 text-xs shrink-0"
                >
                  {isTesting ? (
                    <RefreshCwIcon className="size-3.5 animate-spin" />
                  ) : (
                    <SendIcon className="size-3.5" />
                  )}
                  Disparar Teste
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Envia a mensagem com dados de teste para seu número via Evolution API.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Basic formatter for WhatsApp message preview:
 * Replaces *bold* with <strong>, and links with underlined text.
 */
function formatWhatsAppText(text: string) {
  if (!text) return "Digite uma mensagem para pré-visualizar...";

  const parts = text.split(/(\*[^*]+\*|https?:\/\/[^\s]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(1, -1)}
        </strong>
      );
    }
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <span key={index} className="text-blue-600 dark:text-blue-400 underline break-all">
          {part}
        </span>
      );
    }
    return part;
  });
}

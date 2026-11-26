"use client";

import { EyeIcon, SendIcon, SparklesIcon } from "lucide-react";

import type { EmailTemplateKey } from "@/lib/email/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { TEMPLATE_CARDS } from "./template-catalog";

type EmailsTemplatesTabProps = {
  onPreviewTemplate: (key: EmailTemplateKey) => void;
  onTestTemplate: (key: EmailTemplateKey, templateName: string) => void;
};

export function EmailsTemplatesTab({
  onPreviewTemplate,
  onTestTemplate,
}: EmailsTemplatesTabProps) {
  return (
    <div className="space-y-4">
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
                    onClick={() => onPreviewTemplate(tpl.key)}
                    className="flex-1 h-8 text-xs gap-1.5"
                  >
                    <EyeIcon className="size-3.5" />
                    <span>Visualizar</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onTestTemplate(tpl.key, tpl.name)}
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
    </div>
  );
}

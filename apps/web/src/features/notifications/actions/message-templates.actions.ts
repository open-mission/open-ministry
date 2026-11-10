"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrganizationContext } from "@/lib/organizations";
import {
  formatPhoneNumberForEvolution,
  sendEvolutionTextMessage,
} from "@/lib/evolution-api";
import {
  interpolateTemplate,
  TEMPLATE_DEFINITIONS,
  type MessageTemplateType,
  type ResolvedTemplate,
} from "@/lib/message-templates";
import { getOrganizationMessageTemplates } from "@/lib/message-templates-server";
import { getOrganizationEvolutionConfig } from "@/lib/notification-service";

const saveTemplateSchema = z.object({
  type: z.enum([
    "invite_church",
    "save_contact",
    "invite_department",
    "assignment",
    "monthly_availability",
    "welcome",
    "announcement",
  ]),
  content: z.string().trim().min(5, "O conteúdo do modelo não pode ficar vazio."),
});

export async function getMessageTemplatesAction(): Promise<{
  ok: boolean;
  templates?: ResolvedTemplate[];
  error?: string;
}> {
  try {
    const context = await getOrganizationContext();
    if (!context) {
      return { ok: false, error: "Organização não selecionada." };
    }

    const templates = await getOrganizationMessageTemplates(context.organization.id);
    return { ok: true, templates };
  } catch (error) {
    console.error("Erro ao buscar modelos de mensagem:", error);
    return { ok: false, error: "Não foi possível carregar os modelos de mensagens." };
  }
}

export async function saveMessageTemplateAction(
  rawInput: z.infer<typeof saveTemplateSchema>,
): Promise<{ ok: boolean; error?: string; template?: ResolvedTemplate }> {
  try {
    const context = await getOrganizationContext();
    if (!context || !context.isAdmin) {
      return { ok: false, error: "Apenas administradores podem personalizar modelos de mensagens." };
    }

    const parsed = saveTemplateSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Dados inválidos." };
    }

    const { type, content } = parsed.data;
    const def = TEMPLATE_DEFINITIONS[type];
    const organizationId = context.organization.id;

    const existing = await db.query.organizationMessageTemplate.findFirst({
      where: and(
        eq(schema.organizationMessageTemplate.organizationId, organizationId),
        eq(schema.organizationMessageTemplate.type, type),
      ),
    });

    if (existing) {
      await db
        .update(schema.organizationMessageTemplate)
        .set({
          content,
          title: def.title,
          updatedAt: new Date(),
        })
        .where(eq(schema.organizationMessageTemplate.id, existing.id));
    } else {
      await db.insert(schema.organizationMessageTemplate).values({
        id: crypto.randomUUID(),
        organizationId,
        type,
        title: def.title,
        content,
        isActive: true,
      });
    }

    revalidateTag(`templates:${organizationId}`, "max");
    revalidatePath("/dashboard/settings");

    return {
      ok: true,
      template: {
        type,
        title: def.title,
        description: def.description,
        category: def.category,
        content,
        defaultContent: def.defaultContent,
        isCustomized: content !== def.defaultContent,
        variables: def.variables,
      },
    };
  } catch (error) {
    console.error("Erro ao salvar modelo de mensagem:", error);
    return { ok: false, error: "Erro ao salvar modelo de mensagem." };
  }
}

export async function resetMessageTemplateAction(
  type: MessageTemplateType,
): Promise<{ ok: boolean; error?: string; defaultContent?: string }> {
  try {
    const context = await getOrganizationContext();
    if (!context || !context.isAdmin) {
      return { ok: false, error: "Apenas administradores podem restaurar modelos de mensagens." };
    }

    const organizationId = context.organization.id;

    await db
      .delete(schema.organizationMessageTemplate)
      .where(
        and(
          eq(schema.organizationMessageTemplate.organizationId, organizationId),
          eq(schema.organizationMessageTemplate.type, type),
        ),
      );

    revalidateTag(`templates:${organizationId}`, "max");
    revalidatePath("/dashboard/settings");

    return {
      ok: true,
      defaultContent: TEMPLATE_DEFINITIONS[type]?.defaultContent || "",
    };
  } catch (error) {
    console.error("Erro ao restaurar modelo de mensagem:", error);
    return { ok: false, error: "Erro ao restaurar modelo para o padrão." };
  }
}

export async function sendTestTemplateMessageAction(input: {
  type: MessageTemplateType;
  recipientPhone: string;
  customContent?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const context = await getOrganizationContext();
    if (!context || !context.isAdmin) {
      return { ok: false, error: "Apenas administradores podem enviar testes." };
    }

    const { type, recipientPhone, customContent } = input;
    const formatted = formatPhoneNumberForEvolution(recipientPhone);
    if (!formatted) {
      return { ok: false, error: "Número de WhatsApp inválido." };
    }

    const { config } = await getOrganizationEvolutionConfig(context.organization.id);
    if (!config) {
      return {
        ok: false,
        error: "Configure e ative a Evolution API antes de enviar mensagens de teste.",
      };
    }

    const def = TEMPLATE_DEFINITIONS[type];
    const templateText = customContent || def?.defaultContent || "";

    // Generate realistic simulated variables
    const sampleVariables: Record<string, string> = {
      name: "João da Silva (Teste)",
      church_name: context.organization.name,
      link: "https://openministry.app/dashboard",
      church_phone: config.instanceName,
      whatsapp_name: config.instanceName,
      department_name: "Ministério de Louvor",
      role: "Membro",
      event_title: "Culto de Celebração",
      function_name: "Violão / Voz",
      event_date: "Domingo, 15/11",
      event_time: "19h00",
      month_name: "Próximo Mês",
      title: "Ensaio Geral",
      body: "Este é um teste de visualização da mensagem configurada.",
    };

    const rendered = interpolateTemplate(templateText, sampleVariables);

    const result = await sendEvolutionTextMessage({
      config,
      to: formatted,
      text: rendered,
    });

    return result;
  } catch (error) {
    console.error("Erro ao enviar mensagem de teste:", error);
    return { ok: false, error: "Falha ao enviar mensagem de teste via WhatsApp." };
  }
}

"use server";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import {
  canManageEventPlan,
  revalidateEvents,
  type EventActionResult,
} from "@/lib/events/action-helpers";

const STARTER_PLAN_TEMPLATE: schema.PlanTemplateItem[] = [
  { type: "header", title: "INTRODUÇÃO & ABERTURA", durationSeconds: 0, order: 0 },
  {
    type: "item",
    title: "Oração Inicial e Boas-Vindas",
    durationSeconds: 300,
    order: 1,
    description: "Acolhimento da congregação e oração de abertura.",
  },
  { type: "header", title: "LOUVOR & ADORAÇÃO", durationSeconds: 0, order: 2 },
  {
    type: "item",
    title: "Momento de Louvor Congregacional",
    durationSeconds: 1200,
    order: 3,
    description: "Músicas e adoração com o ministério de louvor.",
  },
  { type: "header", title: "COMUNHÃO & AVISOS", durationSeconds: 0, order: 4 },
  {
    type: "item",
    title: "Avisos e Recepção de Visitantes",
    durationSeconds: 300,
    order: 5,
    description: "Avisos gerais e acolhimento dos que nos visitam pela primeira vez.",
  },
  {
    type: "item",
    title: "Dízimos e Ofertas",
    durationSeconds: 420,
    order: 6,
    description: "Oração e cântico de gratidão pelas ofertas.",
  },
  { type: "header", title: "MINISTRAÇÃO DA PALAVRA", durationSeconds: 0, order: 7 },
  {
    type: "item",
    title: "Pregação da Palavra",
    durationSeconds: 2100,
    order: 8,
    description: "Ministração bíblica principal.",
  },
  { type: "header", title: "ENCERRAMENTO", durationSeconds: 0, order: 9 },
  {
    type: "item",
    title: "Apelo / Oração Final e Bênção Apostólica",
    durationSeconds: 480,
    order: 10,
    description: "Oração pastoral e encerramento.",
  },
];

export async function savePlanAsTemplateAction(
  eventId: string,
  name: string,
  description?: string,
): Promise<{ ok: boolean; error?: string; templateId?: string }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );
  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente para salvar modelo." };
  }

  const canManageTemplates = await can("schedules", "manageTemplates");
  if (!canManageTemplates) {
    return {
      ok: false,
      error: "Você não tem permissão para gerenciar modelos de cronograma.",
    };
  }

  if (!name || !name.trim()) {
    return { ok: false, error: "Informe um nome para o modelo." };
  }

  try {
    const rawItems = await db.query.eventPlanItem.findMany({
      where: eq(schema.eventPlanItem.eventId, eventId),
      orderBy: [asc(schema.eventPlanItem.order)],
      with: {
        person: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (rawItems.length === 0) {
      return {
        ok: false,
        error:
          "O cronograma está vazio. Adicione momentos antes de salvar como modelo.",
      };
    }

    const items: schema.PlanTemplateItem[] = rawItems.map((item, index) => ({
      type: item.type as "header" | "item",
      title: item.title,
      description: item.description,
      durationSeconds: item.durationSeconds,
      order: index,
      customResponsible: item.customResponsible ?? (item.person?.name || null),
      songId: item.songId ?? null,
    }));

    const id = randomUUID();
    await db.insert(schema.planTemplate).values({
      id,
      organizationId: context.organization.id,
      name: name.trim(),
      description: description?.trim() || null,
      items,
    });

    return { ok: true, templateId: id };
  } catch (error) {
    console.error("Erro ao salvar modelo de cronograma", error);
    return { ok: false, error: "Não foi possível salvar o modelo." };
  }
}

export type SavedPlanTemplate = {
  id: string;
  name: string;
  description: string | null;
  items: schema.PlanTemplateItem[];
  createdAt: Date;
  updatedAt: Date;
};

export async function listPlanTemplatesAction(): Promise<{
  ok: boolean;
  templates?: SavedPlanTemplate[];
  error?: string;
}> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canRead = await can("schedules", "read");
  if (!canRead) {
    return {
      ok: false,
      error: "Você não tem permissão para visualizar modelos de cronograma.",
    };
  }

  try {
    const templates = await db.query.planTemplate.findMany({
      where: eq(schema.planTemplate.organizationId, context.organization.id),
      orderBy: [desc(schema.planTemplate.createdAt)],
    });

    return { ok: true, templates };
  } catch (error) {
    console.error("Erro ao listar modelos de cronograma", error);
    return { ok: false, error: "Não foi possível carregar os modelos." };
  }
}

export async function applyPlanTemplateAction(
  eventId: string,
  templateId: string | "starter",
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );
  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente." };
  }

  let itemsToApply: schema.PlanTemplateItem[] = [];

  if (templateId === "starter") {
    itemsToApply = STARTER_PLAN_TEMPLATE;
  } else {
    const template = await db.query.planTemplate.findFirst({
      where: and(
        eq(schema.planTemplate.id, templateId),
        eq(schema.planTemplate.organizationId, context.organization.id),
      ),
    });

    if (!template) {
      return { ok: false, error: "Modelo não encontrado." };
    }

    itemsToApply = template.items;
  }

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.eventId, eventId));

    const rows: (typeof schema.eventPlanItem.$inferInsert)[] = itemsToApply.map(
      (item, index) => ({
        id: randomUUID(),
        eventId,
        type: item.type,
        title: item.title,
        description: item.description ?? null,
        durationSeconds: item.durationSeconds ?? 0,
        order: index,
        customResponsible: item.customResponsible ?? null,
        songId: item.songId ?? null,
      }),
    );

    if (rows.length > 0) {
      await db.insert(schema.eventPlanItem).values(rows);
    }
  } catch (error) {
    console.error("Erro ao aplicar modelo no cronograma", error);
    return { ok: false, error: "Não foi possível aplicar o modelo." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function deletePlanTemplateAction(
  templateId: string,
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManageTemplates = await can("schedules", "manageTemplates");
  if (!canManageTemplates) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir modelos de cronograma.",
    };
  }

  try {
    await db
      .delete(schema.planTemplate)
      .where(
        and(
          eq(schema.planTemplate.id, templateId),
          eq(schema.planTemplate.organizationId, context.organization.id),
        ),
      );
    return { ok: true };
  } catch (error) {
    console.error("Erro ao excluir modelo de cronograma", error);
    return { ok: false, error: "Não foi possível excluir o modelo." };
  }
}

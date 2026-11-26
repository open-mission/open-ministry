"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrganizationContext } from "@/lib/organizations";
import {
  canManageEventPlan,
  optionalText,
  revalidateEvents,
  type EventActionResult,
} from "@/lib/events/action-helpers";

const MAX_IMPORT_PLAN_ITEMS = 500;

const planItemSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório."),
  type: z.enum(["header", "item"]).default("item"),
  title: z
    .string()
    .trim()
    .min(1, "Informe o título do item ou seção.")
    .max(120, "O título pode ter no máximo 120 caracteres."),
  description: optionalText(500, "A descrição pode ter no máximo 500 caracteres."),
  durationSeconds: z.coerce.number().min(0).default(0),
  personId: z.string().optional().or(z.literal("")),
  customResponsible: optionalText(120, "O responsável pode ter no máximo 120 caracteres."),
  sectionId: z.string().optional().or(z.literal("")),
  songId: z.string().optional().or(z.literal("")),
});

export type PlanItemFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string[];
        description?: string[];
        durationSeconds?: string[];
      };
      success?: boolean;
    }
  | undefined;

export async function createPlanItemAction(
  _state: PlanItemFormState,
  formData: FormData,
): Promise<PlanItemFormState> {
  const parsed = planItemSchema.safeParse({
    eventId: formData.get("eventId"),
    type: formData.get("type") ?? "item",
    title: formData.get("title"),
    description: formData.get("description"),
    durationSeconds: formData.get("durationSeconds") ?? 0,
    personId: formData.get("personId") ?? undefined,
    customResponsible: formData.get("customResponsible") ?? undefined,
    sectionId: formData.get("sectionId") ?? undefined,
    songId: formData.get("songId") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    parsed.data.eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error: "Você não tem permissão para editar o cronograma deste evento.",
    };
  }

  const existingItems = await db.query.eventPlanItem.findMany({
    where: eq(schema.eventPlanItem.eventId, parsed.data.eventId),
    columns: { order: true },
  });

  const nextOrder =
    existingItems.reduce((max, item) => Math.max(max, item.order), -1) + 1;

  try {
    await db.insert(schema.eventPlanItem).values({
      id: randomUUID(),
      eventId: parsed.data.eventId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      durationSeconds: parsed.data.durationSeconds,
      order: nextOrder,
      personId: parsed.data.personId || null,
      customResponsible: parsed.data.customResponsible || null,
      sectionId: parsed.data.sectionId || null,
      songId: parsed.data.songId || null,
    });
  } catch (error) {
    console.error("Erro ao criar item do cronograma", error);
    return { error: "Não foi possível adicionar o item ao cronograma." };
  }

  await revalidateEvents(parsed.data.eventId, context.organization.id);
  return { success: true };
}

export async function updatePlanItemAction(
  _state: PlanItemFormState,
  formData: FormData,
): Promise<PlanItemFormState> {
  const itemId = formData.get("id")?.toString();
  if (!itemId) {
    return { error: "Item não informado." };
  }

  const parsed = planItemSchema.safeParse({
    eventId: formData.get("eventId"),
    type: formData.get("type") ?? "item",
    title: formData.get("title"),
    description: formData.get("description"),
    durationSeconds: formData.get("durationSeconds") ?? 0,
    personId: formData.get("personId") ?? undefined,
    customResponsible: formData.get("customResponsible") ?? undefined,
    sectionId: formData.get("sectionId") ?? undefined,
    songId: formData.get("songId") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    parsed.data.eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error: "Você não tem permissão para editar o cronograma deste evento.",
    };
  }

  try {
    await db
      .update(schema.eventPlanItem)
      .set({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        durationSeconds: parsed.data.durationSeconds,
        personId: parsed.data.personId || null,
        customResponsible: parsed.data.customResponsible || null,
        songId: parsed.data.songId || null,
      })
      .where(eq(schema.eventPlanItem.id, itemId));
  } catch (error) {
    console.error("Erro ao atualizar item do cronograma", error);
    return { error: "Não foi possível salvar as alterações." };
  }

  await revalidateEvents(parsed.data.eventId, context.organization.id);
  return { success: true };
}

export async function deletePlanItemAction(
  itemId: string,
  eventId: string,
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

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.id, itemId));
  } catch (error) {
    console.error("Erro ao remover item do cronograma", error);
    return { ok: false, error: "Não foi possível remover o item." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function reorderPlanItemsAction(
  eventId: string,
  orderedIds: string[],
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

  try {
    for (let index = 0; index < orderedIds.length; index++) {
      await db
        .update(schema.eventPlanItem)
        .set({ order: index })
        .where(
          and(
            eq(schema.eventPlanItem.id, orderedIds[index]),
            eq(schema.eventPlanItem.eventId, eventId),
          ),
        );
    }
  } catch (error) {
    console.error("Erro ao reordenar cronograma", error);
    return { ok: false, error: "Não foi possível reordenar o cronograma." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function clearEventPlanAction(
  eventId: string,
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

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.eventId, eventId));
  } catch (error) {
    console.error("Erro ao limpar cronograma", error);
    return { ok: false, error: "Não foi possível limpar o cronograma." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function importPlanItemsAction(
  eventId: string,
  items: schema.PlanTemplateItem[],
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

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Arquivo de cronograma vazio ou inválido." };
  }

  if (items.length > MAX_IMPORT_PLAN_ITEMS) {
    return { ok: false, error: "Limite máximo de 500 itens por cronograma." };
  }

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.eventId, eventId));

    const rows: (typeof schema.eventPlanItem.$inferInsert)[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item.title) continue;
      rows.push({
        id: randomUUID(),
        eventId,
        type: item.type === "header" ? "header" : "item",
        title: item.title.trim(),
        description: item.description ? String(item.description).trim() : null,
        durationSeconds:
          typeof item.durationSeconds === "number" && item.durationSeconds >= 0
            ? Math.round(item.durationSeconds)
            : 0,
        order: index,
        customResponsible: item.customResponsible
          ? String(item.customResponsible).trim()
          : null,
        songId: item.songId ? String(item.songId).trim() : null,
      });
    }

    if (rows.length > 0) {
      await db.insert(schema.eventPlanItem).values(rows);
    }
  } catch (error) {
    console.error("Erro ao importar cronograma", error);
    return { ok: false, error: "Não foi possível importar o cronograma." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

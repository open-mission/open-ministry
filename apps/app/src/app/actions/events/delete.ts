"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getEvent } from "@/lib/events";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import {
  revalidateEvents,
  type EventActionResult,
} from "@/lib/events/action-helpers";

export async function deleteEventAction(
  input: string | FormData,
  scopeInput: "single" | "series" = "single",
): Promise<EventActionResult> {
  const eventId = typeof input === "string" ? input : input.get("eventId");
  const scope =
    typeof input === "string"
      ? scopeInput
      : ((input.get("scope") as "single" | "series") || scopeInput);

  if (!eventId || typeof eventId !== "string") {
    return { ok: false, error: "Evento inválido." };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return {
      ok: false,
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  const event = await getEvent(context.organization.id, eventId);

  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const allowed = await can("agenda", "deleteEvent", { eventId: event.id });
  if (!allowed) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir este evento.",
    };
  }

  try {
    if (scope === "series" && event.seriesId) {
      await db
        .delete(schema.event)
        .where(
          and(
            eq(schema.event.organizationId, context.organization.id),
            eq(schema.event.seriesId, event.seriesId),
          ),
        );
    } else {
      await db.delete(schema.event).where(eq(schema.event.id, event.id));
    }
  } catch (error) {
    console.error("Erro ao excluir evento", error);
    return { ok: false, error: "Não foi possível excluir o evento." };
  }

  await revalidateEvents(event.id, context.organization.id);
  return { ok: true };
}

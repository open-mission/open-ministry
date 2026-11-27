"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { generatePublicShareToken } from "@/lib/public-share";
import { getOrganizationContext } from "@/lib/organizations";
import {
  canManageEventPlan,
  revalidateEvents,
} from "@/lib/events/action-helpers";

export async function getEventPublicShareInfoAction(eventId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, eventId),
      eq(schema.event.organizationId, context.organization.id),
    ),
    columns: {
      id: true,
      isPublicShareEnabled: true,
      publicShareToken: true,
      publicShareAllowPdf: true,
      publicShareUpdatedAt: true,
    },
  });

  if (!event) {
    return { error: "Evento não encontrado." };
  }

  return {
    ok: true,
    isPublicShareEnabled: event.isPublicShareEnabled,
    publicShareToken: event.publicShareToken,
    publicShareAllowPdf: event.publicShareAllowPdf,
    publicShareUpdatedAt: event.publicShareUpdatedAt,
  };
}

export async function toggleEventPublicShareAction(input: {
  eventId: string;
  enabled: boolean;
  allowPdf?: boolean;
}) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    input.eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error:
        "Você não tem permissão para alterar o compartilhamento deste cronograma.",
    };
  }

  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, input.eventId),
      eq(schema.event.organizationId, context.organization.id),
    ),
    columns: {
      id: true,
      publicShareToken: true,
      publicShareAllowPdf: true,
    },
  });

  if (!event) {
    return { error: "Evento não encontrado." };
  }

  const token =
    event.publicShareToken || generatePublicShareToken();
  const allowPdf =
    input.allowPdf !== undefined ? input.allowPdf : event.publicShareAllowPdf;

  await db
    .update(schema.event)
    .set({
      isPublicShareEnabled: input.enabled,
      publicShareToken: token,
      publicShareAllowPdf: allowPdf,
      publicShareUpdatedAt: new Date(),
    })
    .where(eq(schema.event.id, input.eventId));

  await revalidateEvents(input.eventId, context.organization.id);

  return {
    ok: true,
    isPublicShareEnabled: input.enabled,
    publicShareToken: token,
    publicShareAllowPdf: allowPdf,
  };
}

export async function regenerateEventPublicShareTokenAction(eventId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error:
        "Você não tem permissão para alterar o compartilhamento deste cronograma.",
    };
  }

  const newToken = generatePublicShareToken();

  await db
    .update(schema.event)
    .set({
      publicShareToken: newToken,
      publicShareUpdatedAt: new Date(),
    })
    .where(eq(schema.event.id, eventId));

  await revalidateEvents(eventId, context.organization.id);

  return {
    ok: true,
    publicShareToken: newToken,
  };
}

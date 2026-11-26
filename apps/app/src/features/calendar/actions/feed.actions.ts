"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId } from "@/lib/people";

import {
  createPersonalFeed,
  listPersonalFeeds,
  revokePersonalFeed,
  rotatePersonalFeed,
  updatePersonalFeedSettings,
  type CalendarFeedSummary,
} from "../services/personal-feed";

const feedSettingsSchema = z.object({
  label: z.string().trim().max(80).optional(),
  includeServices: z.boolean(),
  includeRehearsals: z.boolean(),
  includeDepartmentEvents: z.boolean(),
  includeAssignments: z.boolean(),
});

const feedIdSchema = z.string().min(1).max(64);

export type CalendarFeedLink = {
  id: string;
  url: string;
  webcalUrl: string;
};

export type CalendarFeedActionError = { ok: false; error: string };

type FeedContext = {
  organizationId: string;
  personId: string;
  userId: string;
};

async function requireFeedContext(): Promise<
  { ok: true; context: FeedContext } | CalendarFeedActionError
> {
  const context = await getOrganizationContext();
  if (!context) {
    return {
      ok: false,
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  const person = await findPersonByUserId(
    context.organization.id,
    context.session.user.id,
  );

  if (!person) {
    return {
      ok: false,
      error:
        "Seu usuário ainda não está vinculado a um membro da igreja. Peça ao administrador para vincular seu cadastro.",
    };
  }

  return {
    ok: true,
    context: {
      organizationId: context.organization.id,
      personId: person.id,
      userId: context.session.user.id,
    },
  };
}

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/profile");
}

/**
 * Cria um link de assinatura. O link só aparece nesta resposta: o banco guarda
 * apenas o hash do token, então não há como consultá-lo depois.
 */
export async function createCalendarFeedAction(
  input: unknown,
): Promise<{ ok: true; feed: CalendarFeedLink } | CalendarFeedActionError> {
  const parsed = feedSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Configuração inválida do calendário." };
  }

  const auth = await requireFeedContext();
  if (!auth.ok) return auth;

  try {
    const feed = await createPersonalFeed({
      ...auth.context,
      settings: parsed.data,
    });
    revalidateSettings();
    return { ok: true, feed };
  } catch (error) {
    console.error("[calendar-feed] Falha ao criar feed:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível criar o link do calendário.",
    };
  }
}

/** Revoga o link atual e devolve um novo, com as mesmas preferências. */
export async function rotateCalendarFeedAction(
  feedId: string,
): Promise<{ ok: true; feed: CalendarFeedLink } | CalendarFeedActionError> {
  const parsedId = feedIdSchema.safeParse(feedId);
  if (!parsedId.success) {
    return { ok: false, error: "Link inválido." };
  }

  const auth = await requireFeedContext();
  if (!auth.ok) return auth;

  const feed = await rotatePersonalFeed({
    ...auth.context,
    feedId: parsedId.data,
  });

  if (!feed) {
    return { ok: false, error: "Este link não existe mais." };
  }

  revalidateSettings();
  return { ok: true, feed };
}

export async function revokeCalendarFeedAction(
  feedId: string,
): Promise<{ ok: true } | CalendarFeedActionError> {
  const parsedId = feedIdSchema.safeParse(feedId);
  if (!parsedId.success) {
    return { ok: false, error: "Link inválido." };
  }

  const auth = await requireFeedContext();
  if (!auth.ok) return auth;

  const revoked = await revokePersonalFeed({
    ...auth.context,
    feedId: parsedId.data,
  });

  if (!revoked) {
    return { ok: false, error: "Este link não existe mais." };
  }

  revalidateSettings();
  return { ok: true };
}

export async function updateCalendarFeedAction(
  feedId: string,
  input: unknown,
): Promise<{ ok: true } | CalendarFeedActionError> {
  const parsedId = feedIdSchema.safeParse(feedId);
  const parsed = feedSettingsSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "Configuração inválida do calendário." };
  }

  const auth = await requireFeedContext();
  if (!auth.ok) return auth;

  const updated = await updatePersonalFeedSettings({
    ...auth.context,
    feedId: parsedId.data,
    settings: parsed.data,
  });

  if (!updated) {
    return { ok: false, error: "Este link não existe mais." };
  }

  revalidateSettings();
  return { ok: true };
}

/** Lista os links ativos do membro — nunca devolve o token. */
export async function listCalendarFeedsAction(): Promise<
  { ok: true; feeds: CalendarFeedSummary[] } | CalendarFeedActionError
> {
  const auth = await requireFeedContext();
  if (!auth.ok) return auth;

  const feeds = await listPersonalFeeds(
    auth.context.organizationId,
    auth.context.personId,
  );

  return { ok: true, feeds };
}

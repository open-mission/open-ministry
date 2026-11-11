"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import {
  getTodayDateString,
  getTodayMoodForPerson,
  savePersonMood,
} from "@/lib/felicitometro";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId } from "@/lib/people";
import { sendWebPushToUser } from "@/lib/push-notifications";
import { logWideEvent, sentryLogger } from "@/lib/telemetry/sentry";

const submitMoodSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  needsPrayer: z.boolean(),
  needsTalk: z.boolean(),
  notes: z
    .string()
    .trim()
    .max(500, "A mensagem pode ter no máximo 500 caracteres.")
    .optional()
    .nullable(),
});

export type SubmitMoodState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

export async function submitDailyMoodAction(
  _state: SubmitMoodState,
  formData: FormData,
): Promise<SubmitMoodState> {
  const context = await requireOrganizationContext();

  sentryLogger.setScopeContext({
    action: "submitDailyMoodAction",
    organizationId: context.organization.id,
    userId: context.session.user.id,
  });

  const person = await findPersonByUserId(
    context.organization.id,
    context.session.user.id,
  );

  if (!person) {
    sentryLogger.warn("submitDailyMoodAction: person record not found for user", {
      organizationId: context.organization.id,
      userId: context.session.user.id,
    });
    return { error: "Perfil de membro não encontrado para sua conta." };
  }

  const rawScore = formData.get("score");
  const rawPrayer = formData.get("needsPrayer");
  const rawTalk = formData.get("needsTalk");
  const rawNotes = formData.get("notes");

  const parsed = submitMoodSchema.safeParse({
    score: rawScore,
    needsPrayer: rawPrayer === "true" || rawPrayer === "on",
    needsTalk: rawTalk === "true" || rawTalk === "on",
    notes: rawNotes ? String(rawNotes) : null,
  });

  if (!parsed.success) {
    return { error: "Por favor, selecione como você está se sentindo hoje." };
  }

  try {
    await savePersonMood({
      organizationId: context.organization.id,
      personId: person.id,
      userId: context.session.user.id,
      score: parsed.data.score,
      needsPrayer: parsed.data.needsPrayer,
      needsTalk: parsed.data.needsTalk,
      notes: parsed.data.notes,
    });
    await cacheInvalidateTags(`mood:${context.organization.id}`);

    logWideEvent("felicitometro.mood_registered", {
      organizationId: context.organization.id,
      personId: person.id,
      score: parsed.data.score,
      needsPrayer: parsed.data.needsPrayer,
      needsTalk: parsed.data.needsTalk,
      hasNotes: Boolean(parsed.data.notes),
    });
  } catch (error) {
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "submitDailyMoodAction",
      organizationId: context.organization.id,
      personId: person.id,
    });
    console.error("Erro ao salvar sentimento diário:", error);
    return { error: "Não foi possível registrar seu sentimento. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function getTodayUserMoodAction() {
  const context = await requireOrganizationContext();
  const person = await findPersonByUserId(
    context.organization.id,
    context.session.user.id,
  );

  if (!person) {
    return null;
  }

  const mood = await getTodayMoodForPerson(
    context.organization.id,
    person.id,
    getTodayDateString(),
  );

  if (!mood) return null;

  return {
    score: mood.score,
    needsPrayer: mood.needsPrayer,
    needsTalk: mood.needsTalk,
    notes: mood.notes,
    date: mood.date,
  };
}

export async function sendFelicitometroPromptAction(): Promise<{
  success: boolean;
  sentCount: number;
  pendingCount: number;
  error?: string;
}> {
  try {
    const context = await requireOrganizationContext();
    const today = getTodayDateString();

    // Membros que já responderam hoje
    const answeredToday = await db.query.personMood.findMany({
      where: and(
        eq(schema.personMood.organizationId, context.organization.id),
        eq(schema.personMood.date, today),
      ),
      columns: { userId: true },
    });

    const answeredUserIds = new Set(
      answeredToday
        .map((m) => m.userId)
        .filter((id): id is string => Boolean(id)),
    );

    const pendingMembers = context.organization.members.filter(
      (m) => m.userId && !answeredUserIds.has(m.userId),
    );

    let sentCount = 0;
    for (const member of pendingMembers) {
      if (!member.userId) continue;
      try {
        const res = await sendWebPushToUser(member.userId, {
          title: "Como você está hoje? ☀️",
          body: "Compartilhe com a liderança como está o seu coração hoje no Felicitômetro.",
          url: "/dashboard",
        });
        if (res.sentCount > 0) sentCount += res.sentCount;
      } catch {
        // Ignora falha de envio individual
      }
    }

    return {
      success: true,
      sentCount,
      pendingCount: pendingMembers.length,
    };
  } catch (error) {
    console.error("Erro ao disparar lembrete do felicitômetro:", error);
    return {
      success: false,
      sentCount: 0,
      pendingCount: 0,
      error: "Falha ao enviar notificações do felicitômetro.",
    };
  }
}

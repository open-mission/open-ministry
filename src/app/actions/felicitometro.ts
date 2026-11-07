"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { cacheInvalidateTags } from "@/lib/cache";
import {
  getTodayDateString,
  getTodayMoodForPerson,
  savePersonMood,
} from "@/lib/felicitometro";
import { requireOrganizationContext } from "@/lib/organizations";
import { findPersonByUserId } from "@/lib/people";

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
  const person = await findPersonByUserId(
    context.organization.id,
    context.session.user.id,
  );

  if (!person) {
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
  } catch (error) {
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

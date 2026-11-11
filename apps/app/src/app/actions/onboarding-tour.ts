"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { syncPersonProfile } from "@/lib/people";
import { getSession } from "@/lib/session";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
} from "@/lib/whatsapp-prompt";
import { telemetryLogger, telemetryMetrics } from "@/lib/telemetry/sentry";

export type OnboardingProfileResult =
  | { ok: true; phone?: string; birthday?: string }
  | { ok: false; error: string };

/**
 * Saves missing profile fields (WhatsApp phone and birth date) collected during onboarding.
 */
export async function saveOnboardingProfileInfoAction(
  data: {
    phone?: string;
    birthday?: string;
  },
): Promise<OnboardingProfileResult> {
  const session = await getSession();
  if (!session?.user) {
    return {
      ok: false,
      error: "Sua sessão expirou. Faça login novamente.",
    };
  }

  const updates: { phone?: string; birthday?: string } = {};

  // Validate phone if provided
  if (data.phone && data.phone.trim().length > 0) {
    const raw = data.phone.trim();
    if (!isValidBrazilianPhone(raw)) {
      return {
        ok: false,
        error: "Número de WhatsApp inválido. Utilize o formato (99) 99999-9999.",
      };
    }
    updates.phone = formatBrazilianPhone(raw);
  }

  // Validate birthday if provided (supports DD/MM/YYYY or YYYY-MM-DD)
  if (data.birthday && data.birthday.trim().length > 0) {
    const raw = data.birthday.trim();
    let isoDate = raw;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split("/");
      isoDate = `${year}-${month}-${day}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const parsed = new Date(`${isoDate}T00:00:00`);
      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed <= new Date() &&
        parsed.getFullYear() >= 1900
      ) {
        updates.birthday = isoDate;
      } else {
        return {
          ok: false,
          error: "Data de nascimento inválida. Verifique o dia, mês e ano.",
        };
      }
    } else {
      return {
        ok: false,
        error: "Formato de data inválido. Utilize DD/MM/AAAA.",
      };
    }
  }

  try {
    if (Object.keys(updates).length > 0) {
      await db
        .update(schema.user)
        .set(updates)
        .where(eq(schema.user.id, session.user.id));

      await syncPersonProfile(session.user.id, updates);

      telemetryLogger.info("Onboarding profile information saved", {
        userId: session.user.id,
        hasPhone: !!updates.phone,
        hasBirthday: !!updates.birthday,
      });
      telemetryMetrics.count("onboarding.profile_saved", 1);
    }

    revalidatePath("/dashboard", "layout");

    return {
      ok: true,
      phone: updates.phone,
      birthday: updates.birthday,
    };
  } catch (error) {
    telemetryLogger.error(
      error instanceof Error ? error : new Error("Failed to save onboarding profile info"),
      { userId: session.user.id },
    );
    return {
      ok: false,
      error: "Ocorreu um erro ao salvar suas informações. Tente novamente.",
    };
  }
}

/**
 * Marks the feature tour as completed for the current user.
 */
export async function completeOnboardingTourAction(): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false };
  }

  try {
    await db
      .update(schema.user)
      .set({ tourCompleted: true })
      .where(eq(schema.user.id, session.user.id));

    telemetryMetrics.count("onboarding.tour_completed", 1);
    telemetryLogger.info("Onboarding tour completed by user", {
      userId: session.user.id,
    });

    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    telemetryLogger.error(
      error instanceof Error ? error : new Error("Failed to complete tour"),
      { userId: session.user.id },
    );
    return { ok: false };
  }
}

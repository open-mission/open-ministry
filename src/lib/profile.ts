import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";

const birthdayInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data no formato AAAA-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date <= new Date() && date.getFullYear() >= 1900;
  }, "Informe uma data de nascimento válida.");

/**
 * Optional date field shared by sign-up, onboarding and invitation acceptance.
 * Empty values are normalized to `undefined` so the column stays null.
 */
export const birthdayFieldSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  birthdayInput.optional(),
);

export async function updateBirthday(
  birthday: string | undefined,
): Promise<void> {
  if (!birthday) {
    return;
  }

  await auth.api.updateUser({
    body: { birthday },
    headers: await headers(),
  });
}

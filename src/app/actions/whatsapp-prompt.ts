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

export type UpdateUserWhatsAppResult =
  | { ok: true; phone: string }
  | { ok: false; error: string };

export async function updateUserWhatsAppAction(
  formData: FormData,
): Promise<UpdateUserWhatsAppResult> {
  const session = await getSession();
  if (!session?.user) {
    return {
      ok: false,
      error: "Sua sessão expirou. Entre novamente para continuar.",
    };
  }

  const rawPhone = (formData.get("phone") as string | null) ?? "";
  const optIn =
    formData.get("optIn") === "true" ||
    formData.get("optIn") === "on" ||
    formData.get("optIn") === "1";

  if (!optIn) {
    return {
      ok: false,
      error: "É necessário confirmar que aceita receber as notificações e avisos da igreja pelo WhatsApp.",
    };
  }

  if (!isValidBrazilianPhone(rawPhone)) {
    return {
      ok: false,
      error: "Informe um número de WhatsApp válido com DDD (ex: (11) 99999-8888).",
    };
  }

  const formattedPhone = formatBrazilianPhone(rawPhone);

  try {
    // 1. Update user record in database
    await db
      .update(schema.user)
      .set({
        phone: formattedPhone,
      })
      .where(eq(schema.user.id, session.user.id));

    // 2. Sync to all person records linked to this user across organizations
    await syncPersonProfile(session.user.id, {
      phone: formattedPhone,
    });

    // 3. Revalidate dashboard layout so new phone is reflected across the app
    revalidatePath("/dashboard", "layout");

    return {
      ok: true,
      phone: formattedPhone,
    };
  } catch (error) {
    console.error("Erro ao salvar telefone de WhatsApp do usuário:", error);
    return {
      ok: false,
      error: "Ocorreu um erro ao salvar seu WhatsApp. Tente novamente.",
    };
  }
}

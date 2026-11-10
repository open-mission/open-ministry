"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSession } from "@/lib/session";

export type PwaPlatform = "ios" | "android" | "desktop";

export type RecordPwaInstallOptions = {
  platform: PwaPlatform;
  isStandalone?: boolean;
};

export async function recordPwaInstallAction(options: RecordPwaInstallOptions) {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: "Não autenticado." };
  }

  try {
    const userRecord = await db.query.user.findFirst({
      where: eq(schema.user.id, session.user.id),
      columns: { pwaInstalled: true, pwaInstalledAt: true },
    });

    const now = new Date();

    await db
      .update(schema.user)
      .set({
        pwaInstalled: true,
        pwaInstalledAt: userRecord?.pwaInstalledAt ?? now,
        pwaPlatform: options.platform,
        pwaLastSeenAt: now,
      })
      .where(eq(schema.user.id, session.user.id));

    return { ok: true };
  } catch (err) {
    console.error("Erro ao registrar instalação de PWA:", err);
    return { ok: false, error: "Falha ao registrar instalação." };
  }
}

import { connection } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSession } from "@/lib/session";
import { WhatsAppPhonePrompt } from "@/components/app/whatsapp-phone-prompt";

export async function WhatsAppPromptLoader() {
  await connection();

  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  // Fast check: if session already has phone, no need to show prompt
  if (session.user.phone && session.user.phone.trim().length > 0) {
    return null;
  }

  // Check database directly to ensure freshness
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { phone: true, name: true },
  });

  if (userRecord?.phone && userRecord.phone.trim().length > 0) {
    return null;
  }

  return (
    <WhatsAppPhonePrompt
      userName={userRecord?.name || session.user.name || "Membro"}
    />
  );
}

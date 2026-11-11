import { connection } from "next/server";

import { WhatsAppPhonePrompt } from "@/components/app/whatsapp-phone-prompt";
import { getSession } from "@/lib/session";
import { getUserRecord } from "@/lib/user-record";

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
  const userRecord = await getUserRecord(session.user.id);

  if (userRecord?.phone && userRecord.phone.trim().length > 0) {
    return null;
  }

  return (
    <WhatsAppPhonePrompt
      userName={userRecord?.name || session.user.name || "Membro"}
    />
  );
}

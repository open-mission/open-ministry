import { connection } from "next/server";

import { ImpersonationBanner } from "@/components/app/impersonation-banner";
import { getSession } from "@/lib/session";

export async function ImpersonationBannerLoader() {
  await connection();

  const session = await getSession();

  if (!session?.session.impersonatedBy) {
    return null;
  }

  return <ImpersonationBanner userName={session.user.name} />;
}

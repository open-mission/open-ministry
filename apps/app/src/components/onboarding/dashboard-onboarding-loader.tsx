import { connection } from "next/server";

import { getSession } from "@/lib/session";
import { getUserRecord } from "@/lib/user-record";
import { DashboardOnboardingModal } from "./dashboard-onboarding-modal";

export async function DashboardOnboardingLoader() {
  await connection();

  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  const userRecord = await getUserRecord(session.user.id);

  return (
    <DashboardOnboardingModal
      userName={userRecord?.name || session.user.name || "Voluntário"}
      initialPhone={userRecord?.phone || session.user.phone || null}
      initialBirthday={userRecord?.birthday || session.user.birthday || null}
      initialTourCompleted={userRecord?.tourCompleted ?? false}
    />
  );
}

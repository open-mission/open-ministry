import { connection } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSession } from "@/lib/session";
import { DashboardOnboardingModal } from "./dashboard-onboarding-modal";

export async function DashboardOnboardingLoader() {
  await connection();

  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: {
      name: true,
      phone: true,
      birthday: true,
      tourCompleted: true,
    },
  });

  return (
    <DashboardOnboardingModal
      userName={userRecord?.name || session.user.name || "Voluntário"}
      initialPhone={userRecord?.phone || session.user.phone || null}
      initialBirthday={userRecord?.birthday || session.user.birthday || null}
      initialTourCompleted={userRecord?.tourCompleted ?? false}
    />
  );
}

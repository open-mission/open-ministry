import { connection } from "next/server";

import { countUnreadNotifications } from "@/lib/notifications";
import { getSession } from "@/lib/session";

export async function GET() {
  await connection();

  const session = await getSession();
  const organizationId = session?.session.activeOrganizationId;

  if (!session || !organizationId) {
    return Response.json({ count: 0 });
  }

  const count = await countUnreadNotifications(
    organizationId,
    session.user.id,
  );

  return Response.json({ count });
}

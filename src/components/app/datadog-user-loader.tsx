import { getSession } from "@/lib/session";

import { DatadogUser } from "./datadog-user";

export async function DatadogUserLoader() {
  const session = await getSession();
  if (!session) return null;

  return <DatadogUser userId={session.user.id} />;
}

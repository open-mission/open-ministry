import { getSession } from "@/lib/session";

import { DatadogUser } from "./datadog-user";

export async function DatadogUserLoader() {
  const session = await getSession();
  if (!session?.user) return null;

  return (
    <DatadogUser
      userId={session.user.id}
      email={session.user.email}
      name={session.user.name}
    />
  );
}

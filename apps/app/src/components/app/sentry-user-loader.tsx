import { getSession } from "@/lib/session";

import { SentryUser } from "./sentry-user";

export async function SentryUserLoader() {
  const session = await getSession();
  if (!session?.user) return null;

  return (
    <SentryUser
      userId={session.user.id}
      email={session.user.email}
      name={session.user.name}
    />
  );
}

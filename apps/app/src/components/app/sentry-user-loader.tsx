import { connection } from "next/server";

import { getSession } from "@/lib/session";

import { SentryUser } from "./sentry-user";

export async function SentryUserLoader() {
  // `connection()` marca o componente como dinâmico, evitando que a leitura da
  // sessão (cookies) quebre o prerender estático.
  await connection();

  const session = await getSession();
  if (!session?.user) return null;

  return (
    <SentryUser
      userId={session.user.id}
      churchId={session.session.activeOrganizationId ?? null}
    />
  );
}

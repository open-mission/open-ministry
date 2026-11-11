import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

/**
 * Reads the current session once per request. Better Auth refreshes the
 * session when needed and `nextCookies()` takes care of the response cookie.
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

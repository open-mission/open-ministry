import "server-only";

import { redirect } from "next/navigation";

import { resolvePlatformGuardRedirect } from "@/components/platform/platform-guard";
import { getSession } from "@/lib/session";

export async function runPlatformPageQuery<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const existingSession = await getSession().catch(() => null);
    const target = resolvePlatformGuardRedirect(Boolean(existingSession), error);
    if (target) {
      redirect(target);
    }
    throw error;
  }
}

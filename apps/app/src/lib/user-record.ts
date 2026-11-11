import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Loads the full user row once per request. Better Auth's session payload
 * already carries the common fields, but some screens need columns it does not
 * expose (for example `tourCompleted`). Sharing this helper keeps the layout
 * loaders and the settings page from issuing the same query several times.
 */
export const getUserRecord = cache(async (userId: string) => {
  return db.query.user.findFirst({
    where: eq(schema.user.id, userId),
  });
});

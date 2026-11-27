import { revalidatePath } from "next/cache";

import { cacheInvalidateTags } from "@/lib/cache";

export type AnnouncementFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string[];
        body?: string[];
        audienceType?: string[];
        departmentId?: string[];
        personId?: string[];
        channels?: string[];
      };
      success?: boolean;
      /** Canais externos foram enfileirados em background. */
      queued?: boolean;
    }
  | undefined;

export type NotificationActionResult = {
  ok: boolean;
  error?: string;
};

export const DISPATCH_BATCH_SIZE = 10;

/** Runs async work in bounded batches; a single failure never aborts the rest. */
export async function runInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<unknown>,
  batchSize = DISPATCH_BATCH_SIZE,
): Promise<{ fulfilled: number; rejected: number }> {
  let fulfilled = 0;
  let rejected = 0;

  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    const settled = await Promise.allSettled(batch.map((item) => worker(item)));

    for (const result of settled) {
      if (result.status === "fulfilled") {
        fulfilled++;
      } else {
        rejected++;
        console.error(
          "[announcement] Falha no disparo em lote:",
          result.reason,
        );
      }
    }
  }

  return { fulfilled, rejected };
}

export async function revalidateNotifications(userId?: string) {
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/announcements");

  if (userId) {
    await cacheInvalidateTags(`notifications:${userId}`);
  }
}

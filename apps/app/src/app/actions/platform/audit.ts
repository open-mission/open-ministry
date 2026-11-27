"use server";

import { and, desc, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSuperAdmin } from "@/lib/platform/auth";

export type PlatformAuditEntry = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  metadataJson: Record<string, unknown>;
  createdAt: Date;
};

export async function listPlatformAuditLogAction(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: PlatformAuditEntry[]; total: number }> {
  await requireSuperAdmin("read-audit");

  const limit = Math.min(options?.limit ?? 50, 100);
  const offset = options?.offset ?? 0;
  const search = options?.search?.trim();
  const searchCondition = search
    ? or(
        ilike(schema.platformAuditLog.action, `%${search}%`),
        ilike(schema.platformAuditLog.summary, `%${search}%`),
        ilike(schema.platformAuditLog.actorEmail, `%${search}%`),
      )
    : undefined;
  const where = searchCondition ? and(searchCondition) : undefined;

  const [rows, countRows] = await Promise.all([
    db.query.platformAuditLog.findMany({
      where,
      orderBy: [desc(schema.platformAuditLog.createdAt)],
      limit,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.platformAuditLog)
      .where(where),
  ]);

  return {
    entries: rows as PlatformAuditEntry[],
    total: Number(countRows[0]?.count ?? rows.length),
  };
}

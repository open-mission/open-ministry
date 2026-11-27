import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Registro interno de auditoria da plataforma. Não é uma Server Action:
 * chamadores devem ser Server Actions/rotas já protegidas por requireSuperAdmin.
 */
export async function recordPlatformAudit(input: {
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadataJson?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(schema.platformAuditLog).values({
    id: randomUUID(),
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    summary: input.summary,
    metadataJson: input.metadataJson ?? {},
  });
}

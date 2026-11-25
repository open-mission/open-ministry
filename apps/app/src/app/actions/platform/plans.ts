"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  DEFAULT_PLATFORM_FEATURES,
  type PlatformFeatureFlags,
} from "@openministry/db";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { invalidateOrganizationEntitlements } from "@/lib/platform/entitlements";
import { recordPlatformAudit } from "@/lib/platform/audit";

const savePlanSchema = z.object({
  id: z.string().trim().min(1).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "O slug deve ter ao menos 2 caracteres.")
    .max(60, "O slug pode ter no máximo 60 caracteres.")
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use apenas letras minúsculas, números, hífens e sublinhados."),
  name: z.string().trim().min(2, "Informe o nome do plano.").max(80, "Nome muito longo."),
  description: z.string().trim().max(300).nullable().optional(),
  features: z
    .object({
      whatsapp_notifications: z.boolean().optional(),
      whatsapp_max_instances: z.number().int().min(0).max(1000).optional(),
    })
    .strict(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export type PlatformPlanView = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  features: PlatformFeatureFlags;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};

export async function listPlatformPlansAction(): Promise<PlatformPlanView[]> {
  await requireSuperAdmin("manage-plans");
  const plans = await db.query.platformPlan.findMany();
  return plans.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    features: { ...DEFAULT_PLATFORM_FEATURES, ...(plan.featuresJson ?? {}) },
    isActive: plan.isActive,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
  }));
}

export async function savePlatformPlanAction(input: {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  features: Partial<PlatformFeatureFlags>;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const session = await requireSuperAdmin("manage-plans");
  const parsed = savePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos: verifique os campos enviados." };
  }
  const data = parsed.data;
  const slug = data.slug;

  const existing = await db.query.platformPlan.findFirst({
    where: eq(schema.platformPlan.slug, slug),
  });
  if (existing && existing.id !== data.id) {
    return { ok: false, error: "Já existe um plano com este slug." };
  }

  const features: PlatformFeatureFlags = {
    ...DEFAULT_PLATFORM_FEATURES,
    ...data.features,
  };
  const id = existing?.id ?? data.id ?? randomUUID();

  if (existing || data.id) {
    await db
      .update(schema.platformPlan)
      .set({
        slug,
        name: data.name.trim(),
        description: data.description ?? null,
        featuresJson: features,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.platformPlan.id, id));
  } else {
    await db.insert(schema.platformPlan).values({
      id,
      slug,
      name: data.name.trim(),
      description: data.description ?? null,
      featuresJson: features,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      sortOrder: data.sortOrder ?? 0,
    });
  }

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "plan.saved",
    targetType: "platform_plan",
    targetId: id,
    summary: `Plano ${data.name.trim()} salvo.`,
    metadataJson: { slug, features: data.features },
  });

  return { ok: true, id };
}

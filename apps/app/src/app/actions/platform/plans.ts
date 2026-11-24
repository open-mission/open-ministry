"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  DEFAULT_PLATFORM_FEATURES,
  type PlatformFeatureFlags,
} from "@openministry/db";
import { requireSuperAdmin } from "@/lib/platform/auth";
import { invalidateOrganizationEntitlements } from "@/lib/platform/entitlements";
import { recordPlatformAudit } from "./audit";

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
  const slug = input.slug.trim().toLowerCase();
  if (!slug || !input.name.trim()) {
    return { ok: false, error: "Slug e nome são obrigatórios." };
  }

  const existing = await db.query.platformPlan.findFirst({
    where: eq(schema.platformPlan.slug, slug),
  });
  if (existing && existing.id !== input.id) {
    return { ok: false, error: "Já existe um plano com este slug." };
  }

  const features: PlatformFeatureFlags = {
    ...DEFAULT_PLATFORM_FEATURES,
    ...input.features,
  };
  const id = existing?.id ?? input.id ?? randomUUID();

  if (existing || input.id) {
    await db
      .update(schema.platformPlan)
      .set({
        slug,
        name: input.name.trim(),
        description: input.description ?? null,
        featuresJson: features,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        sortOrder: input.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.platformPlan.id, id));
  } else {
    await db.insert(schema.platformPlan).values({
      id,
      slug,
      name: input.name.trim(),
      description: input.description ?? null,
      featuresJson: features,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  await invalidateOrganizationEntitlements();
  await recordPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "plan.saved",
    targetType: "platform_plan",
    targetId: id,
    summary: `Plano ${input.name.trim()} salvo.`,
    metadataJson: { slug, features: input.features },
  });

  return { ok: true, id };
}

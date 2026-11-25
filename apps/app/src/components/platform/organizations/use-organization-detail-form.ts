"use client";

import { useState } from "react";

import type { getPlatformOrganizationAction } from "@/app/actions/platform";

export type OrganizationDetailData = Awaited<
  ReturnType<typeof getPlatformOrganizationAction>
>;

export type OrganizationStatus = "active" | "trial" | "suspended";
export type WhatsAppOverride = "inherit" | "enabled" | "disabled";

export function useOrganizationDetailForm() {
  const [editStatus, setEditStatus] = useState<OrganizationStatus>("active");
  const [editPlanId, setEditPlanId] = useState<string>("");
  const [editWhatsappOverride, setEditWhatsappOverride] =
    useState<WhatsAppOverride>("inherit");
  const [editMaxInstances, setEditMaxInstances] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  function hydrateDetailForm(data: OrganizationDetailData) {
    const currentStatus =
      (data.settings?.status as OrganizationStatus | undefined) ??
      (data.organization?.status as OrganizationStatus | undefined) ??
      "active";
    setEditStatus(currentStatus);
    setEditPlanId(data.settings?.planId ?? data.organization?.plan?.id ?? "");
    const overrides = data.settings?.featureOverrides ?? {};
    if (overrides.whatsapp_notifications === true) {
      setEditWhatsappOverride("enabled");
    } else if (overrides.whatsapp_notifications === false) {
      setEditWhatsappOverride("disabled");
    } else {
      setEditWhatsappOverride("inherit");
    }
    setEditMaxInstances(
      typeof overrides.whatsapp_max_instances === "number"
        ? String(overrides.whatsapp_max_instances)
        : "",
    );
    setEditNotes(data.settings?.notes ?? "");
  }

  function buildFeatureOverrides(): Record<string, unknown> {
    const featureOverrides: Record<string, unknown> = {};
    if (editWhatsappOverride === "enabled") {
      featureOverrides.whatsapp_notifications = true;
    } else if (editWhatsappOverride === "disabled") {
      featureOverrides.whatsapp_notifications = false;
    }
    if (editMaxInstances.trim() !== "") {
      const parsedMax = Number(editMaxInstances);
      if (!Number.isNaN(parsedMax) && parsedMax >= 0) {
        featureOverrides.whatsapp_max_instances = parsedMax;
      }
    }
    return featureOverrides;
  }

  function buildUpdatePayload() {
    return {
      status: editStatus,
      planId: editPlanId || null,
      featureOverrides: buildFeatureOverrides(),
      notes: editNotes.trim() || null,
    };
  }

  return {
    editStatus,
    setEditStatus,
    editPlanId,
    setEditPlanId,
    editWhatsappOverride,
    setEditWhatsappOverride,
    editMaxInstances,
    setEditMaxInstances,
    editNotes,
    setEditNotes,
    hydrateDetailForm,
    buildFeatureOverrides,
    buildUpdatePayload,
  };
}

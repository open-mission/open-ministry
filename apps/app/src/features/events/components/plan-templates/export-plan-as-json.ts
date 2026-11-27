"use client";

import { toast } from "sonner";
import type { ComputedPlanItem } from "@/lib/plan-utils";

export function exportPlanAsJson(
  eventTitle: string,
  items: ComputedPlanItem[],
) {
  if (items.length === 0) {
    toast.error("Não há momentos para exportar.");
    return;
  }

  const exportPayload = {
    openMinistryPlanVersion: 1,
    title: eventTitle,
    exportedAt: new Date().toISOString(),
    itemsCount: items.length,
    items: items.map((item, index) => ({
      type: item.type === "header" ? "header" : "item",
      title: item.title,
      description: item.description ?? null,
      durationSeconds: item.durationSeconds ?? 0,
      order: index,
      customResponsible:
        item.customResponsible ?? (item.person?.name || null),
    })),
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportPayload, null, 2),
  )}`;
  const downloadAnchor = document.createElement("a");
  const fileName = `cronograma-${eventTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${new Date().toISOString().slice(0, 10)}.json`;

  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  toast.success("Cronograma exportado como arquivo JSON!");
}

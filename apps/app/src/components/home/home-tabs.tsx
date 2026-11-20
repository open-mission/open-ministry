"use client";

import type { ReactNode } from "react";

import { useHomeTab } from "./home-tab-context";

/**
 * Corpo da home. As abas vivem no header do layout; aqui apenas o painel ativo
 * é montado, evitando uma segunda barra de abas dentro da página.
 */
export function HomeTabs({
  today,
  church,
}: {
  today: ReactNode;
  church: ReactNode;
}) {
  const homeTab = useHomeTab();
  const activeTab = homeTab?.activeTab ?? "hoje";

  if (activeTab === "hoje") {
    return (
      <div
        role="tabpanel"
        id="home-panel-hoje"
        aria-labelledby="home-tab-hoje"
        className="flex flex-col gap-6"
      >
        {today}
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="home-panel-igreja"
      aria-labelledby="home-tab-igreja"
      className="flex flex-col gap-6"
    >
      {church}
    </div>
  );
}

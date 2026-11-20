"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type HomeTab = "hoje" | "igreja";

type HomeTabContextValue = {
  activeTab: HomeTab;
  setActiveTab: (tab: HomeTab) => void;
};

const HomeTabContext = createContext<HomeTabContextValue | null>(null);

/**
 * Compartilha a visão ativa da home entre o header (onde ficam as abas) e o
 * corpo da página (onde ficam os painéis). Fora do provider o hook retorna
 * `null`, preservando o uso isolado dos componentes em testes.
 */
export function HomeTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<HomeTab>("hoje");

  return (
    <HomeTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </HomeTabContext.Provider>
  );
}

export function useHomeTab() {
  return useContext(HomeTabContext);
}

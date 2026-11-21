"use client";

import { createContext, useContext } from "react";

export type SettingsModalContextValue = {
  open: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

export const SettingsModalContext =
  createContext<SettingsModalContextValue | null>(null);

export function useSettingsModal() {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error(
      "useSettingsModal deve ser utilizado dentro de SettingsModalProvider",
    );
  }
  return context;
}

export function useOptionalSettingsModal() {
  return useContext(SettingsModalContext);
}

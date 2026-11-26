"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, type ReactNode } from "react";

import {
  SettingsModalContext,
  useOptionalSettingsModal,
  useSettingsModal,
} from "@/components/settings/settings-modal-context";

export { useOptionalSettingsModal, useSettingsModal };

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const openSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const closeSettings = useCallback(() => {}, []);

  const value = useMemo(
    () => ({ open: false, openSettings, closeSettings }),
    [openSettings, closeSettings],
  );

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
    </SettingsModalContext.Provider>
  );
}

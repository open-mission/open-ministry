"use client";

import { useEffect } from "react";

import { recordPwaInstallAction } from "@/app/actions/pwa";
import {
  checkIsStandalone,
  detectPwaPlatform,
} from "@/components/pwa/use-pwa-install";

const TRACKED_KEY = "openministry_pwa_session_tracked";

export function PwaInstallTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const platform = detectPwaPlatform();
    const isStandalone = checkIsStandalone();

    if (isStandalone) {
      // Avoid calling on every internal navigation within the same session
      const alreadyTracked = window.sessionStorage.getItem(TRACKED_KEY);
      if (!alreadyTracked) {
        recordPwaInstallAction({ platform, isStandalone: true })
          .then((res) => {
            if (res.ok) {
              window.sessionStorage.setItem(TRACKED_KEY, "true");
            }
          })
          .catch(() => {
            // Ignore offline or silent tracking errors
          });
      }
    }

    const handleAppInstalled = () => {
      recordPwaInstallAction({ platform, isStandalone: true })
        .then((res) => {
          if (res.ok) {
            window.sessionStorage.setItem(TRACKED_KEY, "true");
          }
        })
        .catch(() => {});
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}

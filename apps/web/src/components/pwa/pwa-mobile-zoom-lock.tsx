"use client";

import { useEffect } from "react";

/**
 * PwaMobileZoomLock
 *
 * Bloqueia o zoom por gestos (pinch-to-zoom / double tap) e auto-zoom no mobile,
 * garantindo uma experiência nativa de app (PWA).
 */
export function PwaMobileZoomLock() {
  useEffect(() => {
    // 1. Desativa o pinch-to-zoom no iOS Safari (WebKit gesturestart / gesturechange / gestureend)
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", preventGesture, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  return null;
}

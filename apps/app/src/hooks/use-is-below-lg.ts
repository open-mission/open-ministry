"use client";

import * as React from "react";

const BELOW_LG_QUERY = "(max-width: 1023px)";

let sharedMql: MediaQueryList | null = null;

function getMql() {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return null;
  }

  if (!sharedMql) {
    sharedMql = window.matchMedia(BELOW_LG_QUERY);
  }

  return sharedMql;
}

function subscribe(callback: () => void) {
  const mql = getMql();

  if (!mql) {
    return () => {};
  }

  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return getMql()?.matches ?? false;
}

function getServerSnapshot() {
  return false;
}

/**
 * Distingue o layout de companhia pastoral (mobile/tablet, < 1024px) do
 * caderno pastoral (desktop, >= 1024px). O fallback de servidor assume
 * desktop para preservar o layout editorial durante o prerender.
 */
export function useIsBelowLg() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

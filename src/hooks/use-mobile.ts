import * as React from "react"

const MOBILE_BREAKPOINT = 768

let sharedMql: MediaQueryList | null = null

function getMql() {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return null
  }
  if (!sharedMql) {
    sharedMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  }
  return sharedMql
}

function subscribe(callback: () => void) {
  const mql = getMql()
  if (!mql) return () => {}
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return getMql()?.matches ?? false
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}


"use client";

import { useSyncExternalStore } from "react";
import {
  CURRENT_APP_VERSION,
  RELEASE_NOTES,
  type ReleaseNote,
} from "@/config/release-notes";

const STORAGE_KEY = "openministry:last_seen_release";

type ReleaseNotesState = {
  isOpen: boolean;
  activeRelease: ReleaseNote;
  hasCheckedAutoOpen: boolean;
};

const defaultRelease =
  RELEASE_NOTES.find((r) => r.version === CURRENT_APP_VERSION) ?? RELEASE_NOTES[0];

let state: ReleaseNotesState = {
  isOpen: false,
  activeRelease: defaultRelease,
  hasCheckedAutoOpen: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const releaseNotesStore = {
  getSnapshot(): ReleaseNotesState {
    return state;
  },

  getServerSnapshot(): ReleaseNotesState {
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  open(version?: string) {
    const target = version
      ? RELEASE_NOTES.find((r) => r.version === version) ?? defaultRelease
      : defaultRelease;

    state = {
      ...state,
      isOpen: true,
      activeRelease: target,
    };
    emitChange();
  },

  close() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, CURRENT_APP_VERSION);
      } catch {
        // Ignora erros de localStorage
      }
    }

    state = {
      ...state,
      isOpen: false,
    };
    emitChange();
  },

  checkAutoOpen() {
    if (state.hasCheckedAutoOpen) return;

    if (typeof window === "undefined") return;

    state = {
      ...state,
      hasCheckedAutoOpen: true,
    };

    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      // Se nunca viu ou é uma versão anterior à atual, abre automaticamente
      if (!lastSeen || lastSeen !== CURRENT_APP_VERSION) {
        state = {
          ...state,
          isOpen: true,
          activeRelease: defaultRelease,
        };
      }
    } catch {
      // Ignora erro de acesso ao localStorage
    }

    emitChange();
  },
};

export function useReleaseNotesStore() {
  return useSyncExternalStore(
    releaseNotesStore.subscribe,
    releaseNotesStore.getSnapshot,
    releaseNotesStore.getServerSnapshot,
  );
}

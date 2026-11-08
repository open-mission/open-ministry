import { Music2Icon } from "lucide-react";

import type { ModuleKey, SystemModule } from "./types";

export const SYSTEM_MODULES: Record<ModuleKey, SystemModule> = {
  music: {
    key: "music",
    name: "Música & Repertório",
    shortName: "Música",
    description:
      "Gerencie o repertório da igreja, letras, cifras, links para YouTube/Spotify e vincule músicas aos momentos do cronograma dos cultos.",
    badge: "Louvor",
    icon: Music2Icon,
    navGroups: [
      {
        title: "Repertório",
        items: [
          {
            href: "/dashboard/songs",
            label: "Músicas",
            icon: Music2Icon,
            exact: false,
          },
        ],
      },
    ],
  },
};

export const AVAILABLE_MODULES = Object.values(SYSTEM_MODULES);

export function getSystemModule(key: string): SystemModule | null {
  if (key in SYSTEM_MODULES) {
    return SYSTEM_MODULES[key as ModuleKey];
  }
  return null;
}

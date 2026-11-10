import {
  CalendarRangeIcon,
  ClipboardListIcon,
  MegaphoneIcon,
  Music2Icon,
} from "lucide-react";

import type { ModuleKey, SystemModule } from "./types";

export const SYSTEM_MODULES: Record<ModuleKey, SystemModule> = {
  agenda: {
    key: "agenda",
    name: "Agenda & Eventos",
    shortName: "Agenda",
    description:
      "Planeje cultos, ensaios, reuniões e eventos especiais no calendário unificado da igreja.",
    badge: "Cultos",
    icon: CalendarRangeIcon,
    navGroups: [],
    routePrefixes: ["/dashboard/calendar", "/dashboard/events"],
  },
  schedules: {
    key: "schedules",
    name: "Escalas & Liturgia",
    shortName: "Escalas",
    description:
      "Gerencie equipes ministeriais, confirme disponibilidade de voluntários e estruture o plano dos cultos.",
    badge: "Equipes",
    icon: ClipboardListIcon,
    navGroups: [],
    routePrefixes: ["/dashboard/schedules", "/dashboard/availability"],
  },
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
    routePrefixes: ["/dashboard/songs"],
  },
  announcements: {
    key: "announcements",
    name: "Avisos & Notificações",
    shortName: "Avisos",
    description:
      "Envie comunicados gerais, avisos por departamento e acompanhe o status de entrega aos membros.",
    badge: "Comunicação",
    icon: MegaphoneIcon,
    navGroups: [],
    routePrefixes: ["/dashboard/announcements"],
  },
};

export const AVAILABLE_MODULES = Object.values(SYSTEM_MODULES);

export function getSystemModule(key: string): SystemModule | null {
  if (key in SYSTEM_MODULES) {
    return SYSTEM_MODULES[key as ModuleKey];
  }
  return null;
}

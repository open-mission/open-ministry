import type { LucideIcon } from "lucide-react";
import type { NavGroup } from "@/components/app/nav-config";

export type ModuleKey =
  | "agenda"
  | "schedules"
  | "music"
  | "announcements"
  | "tasks";

export type SystemModule = {
  key: ModuleKey;
  name: string;
  shortName: string;
  description: string;
  badge?: string;
  icon: LucideIcon;
  navGroups: NavGroup[];
  routePrefixes: string[];
};

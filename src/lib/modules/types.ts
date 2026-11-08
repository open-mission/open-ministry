import type { LucideIcon } from "lucide-react";
import type { NavGroup } from "@/components/app/nav-config";

export type ModuleKey = "music";

export type SystemModule = {
  key: ModuleKey;
  name: string;
  shortName: string;
  description: string;
  badge?: string;
  icon: LucideIcon;
  navGroups: NavGroup[];
};

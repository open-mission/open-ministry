import type { LucideIcon } from "lucide-react";

import type { ChurchWhatsAppView } from "@/app/actions/church-whatsapp";
import type { OrganizationPermissionSettingsData } from "@/app/actions/permissions";
import type {
  PasskeyViewItem,
  SessionItem,
} from "@/app/actions/settings";
import type { CalendarPreferences } from "@/lib/calendar";
import type { CalendarFeedView } from "@/lib/calendar-feed-data";
import type { ResolvedTemplate } from "@/lib/message-templates";

export type SettingsScope = "account" | "church";

export type AccountTabId =
  | "profile"
  | "calendar"
  | "notifications"
  | "theme"
  | "security"
  | "app";

export type ChurchTabId = "church" | "whatsapp" | "templates" | "permissions";

export type MobileSettingsSection =
  | "account"
  | "theme"
  | "notifications"
  | "calendar"
  | "pwa_offline"
  | "security"
  | "about"
  | "church"
  | "whatsapp"
  | "templates"
  | "nomenclature"
  | "permissions";

export type SettingsViewProps = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date | string;
    metadata?: string | null;
  };
  role: string;
  isAdmin: boolean;
  userData: {
    name: string;
    username: string | null;
    email: string;
    birthday: string | null;
    phone: string | null;
    image: string | null;
  };
  calendarPreferences: CalendarPreferences;
  calendarFeeds: CalendarFeedView[];
  initialSessions: SessionItem[];
  initialPasskeys: PasskeyViewItem[];
  peopleCount: number;
  departmentsCount: number;
  churchWhatsapp: ChurchWhatsAppView | null;
  messageTemplates: ResolvedTemplate[];
  permissionSettings?: OrganizationPermissionSettingsData | null;
  initialScope?: SettingsScope;
  initialTab?: string;
  isModal?: boolean;
};

export type DesktopTabItem<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export type MobileRowItem = {
  id: MobileSettingsSection;
  label: string;
  status?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  icon: LucideIcon;
};

import type { LucideIcon } from "lucide-react";

import type { EmailLogItem, EmailStats } from "@/app/actions/emails";
import type { EmailTemplateKey } from "@/lib/email/templates";

export type EmailsConsoleProps = {
  initialLogs: EmailLogItem[];
  initialStats: EmailStats;
  churchName: string;
  userEmail: string;
};

export type EmailStatusFilter = "all" | "sent" | "failed";

export type TemplateCardInfo = {
  key: EmailTemplateKey;
  name: string;
  category: "auth" | "escala" | "comunicacao";
  categoryLabel: string;
  description: string;
  defaultSubject: string;
  icon: LucideIcon;
};

export type TemplatePreviewState = {
  open: boolean;
  templateKey: EmailTemplateKey | null;
  html: string;
  subject: string;
  previewMode: "desktop" | "mobile";
  loading: boolean;
};

export type TestEmailDialogState = {
  open: boolean;
  templateKey: EmailTemplateKey | null;
  templateName: string;
  targetEmail: string;
  loading: boolean;
};

export type LogFilters = {
  search: string;
  statusFilter: EmailStatusFilter;
  typeFilter: string;
};

export type { EmailLogItem, EmailStats };

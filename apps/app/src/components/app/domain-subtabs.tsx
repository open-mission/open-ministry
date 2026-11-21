"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CakeIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  HandHeartIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  Music2Icon,
  Music4Icon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import { isNavItemActive } from "@/components/app/nav-config";
import type { DomainSubtabData } from "@/components/app/domain-subtabs-data";
import { cn } from "@/lib/utils";

const subtabIcons: Record<string, LucideIcon> = {
  "/calendar": CalendarRangeIcon,
  "/events": CalendarDaysIcon,
  "/schedules": ClipboardListIcon,
  "/availability": CalendarCheckIcon,
  "/songs": Music2Icon,
  "/rehearsals": Music4Icon,
  "/members": UsersIcon,
  "/departments": HandHeartIcon,
  "/birthdays": CakeIcon,
  "/announcements": MegaphoneIcon,
  "/whatsapp": MessageSquareIcon,
  "/emails": MailIcon,
};

export function DomainSubtabsNav({
  domainLabel,
  tabs,
}: {
  domainLabel: string;
  tabs: DomainSubtabData[];
}) {
  const pathname = usePathname();

  if (tabs.length <= 1) return null;

  return (
    <nav
      aria-label={`Sub-abas de ${domainLabel}`}
      className="hidden md:flex w-fit max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-muted/70 p-1"
    >
      {tabs.map((tab) => {
        const isActive = isNavItemActive(tab, pathname);
        const Icon = subtabIcons[tab.href];

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={true}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-border/70 bg-card text-foreground shadow-2xs"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-4" /> : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

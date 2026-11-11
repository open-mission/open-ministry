"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isMobileNavRoute } from "@/components/app/nav-config";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  dashboard: "Início",
  events: "Cultos e eventos",
  schedules: "Escalas",
  members: "Pessoas",
  departments: "Departamentos",
  birthdays: "Aniversariantes",
  church: "Igreja",
  settings: "Configurações",
  profile: "Meu perfil",
  notifications: "Notificações",
  songs: "Músicas",
};

export function DashboardBreadcrumbFallback() {
  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Início</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbClassName = cn(
    isMobileNavRoute(pathname) && "hidden md:block",
  );

  if (segments.length <= 1) {
    return (
      <Breadcrumb className={breadcrumbClassName}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Início</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const items = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    let label = routeLabels[seg];

    if (!label) {
      const prev = segments[idx - 1];
      if (prev === "events") {
        label = "Detalhes do culto";
      } else if (prev === "departments") {
        label = "Detalhes da equipe";
      } else if (prev === "songs") {
        label = "Detalhes da música";
      } else {
        label = "Detalhes";
      }
    }

    return { href, label, isLast };
  });

  const isNav = isMobileNavRoute(pathname);
  const currentLabel = items[items.length - 1]?.label ?? "Detalhes";

  return (
    <div className="flex min-w-0 items-center">
      {!isNav ? (
        <span className="truncate font-heading text-sm font-semibold text-foreground md:hidden">
          {currentLabel}
        </span>
      ) : null}
      <Breadcrumb className="hidden md:block">
        <BreadcrumbList>
          {items.map((item, index) => (
            <React.Fragment key={item.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {item.isLast ? (
                  <BreadcrumbPage className="font-medium text-foreground">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} prefetch={true}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

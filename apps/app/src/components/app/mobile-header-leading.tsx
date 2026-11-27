"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { OpenMinistrySymbol } from "@/components/brand/openministry-logo";
import {
  getParentHref,
  isMobileNavRoute,
} from "@/components/app/nav-config";
import { Button } from "@/components/ui/button";

export function MobileHeaderLeading({
  organizationLogo,
  organizationName,
  greeting,
  firstName,
}: {
  organizationLogo?: string | null;
  organizationName?: string;
  greeting?: string;
  firstName?: string;
}) {
  const pathname = usePathname();

  if (pathname === "/" && greeting && firstName) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:hidden">
        <Link
          href="/"
          className="shrink-0 transition-transform active:scale-95"
          aria-label={organizationName ?? "Início"}
        >
          {organizationLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organizationLogo}
              alt={organizationName ?? "Logo da igreja"}
              className="size-8.5 rounded-[10px] object-cover shrink-0"
            />
          ) : (
            <div className="flex size-8.5 items-center justify-center rounded-[10px] bg-[#1e472f] text-[#faf7ee] shrink-0 shadow-xs dark:border dark:border-[#2c5b3f] dark:bg-[#1a3c28]">
              <OpenMinistrySymbol className="size-4.25" />
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          {organizationName ? (
            <p className="truncate text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {organizationName}
            </p>
          ) : null}
          <h1 className="truncate font-heading text-[21px] leading-tight font-semibold tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
        </div>
      </div>
    );
  }

  if (isMobileNavRoute(pathname)) {
    return (
      <Link
        href="/"
        className="flex items-center gap-2 lg:hidden transition-transform active:scale-95 shrink-0"
        aria-label={organizationName ?? "Início"}
      >
        {organizationLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organizationLogo}
            alt={organizationName ?? "Logo da igreja"}
            className="size-8 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-xs">
            <OpenMinistrySymbol className="size-4" />
          </div>
        )}
      </Link>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label="Voltar"
      title="Voltar"
      className="-ml-2 size-11 shrink-0 lg:hidden"
    >
      <Link href={getParentHref(pathname)}>
        <ArrowLeftIcon className="size-5" />
      </Link>
    </Button>
  );
}

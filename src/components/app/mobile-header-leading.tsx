"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import {
  getParentHref,
  isMobileNavRoute,
} from "@/components/app/nav-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function MobileHeaderLeading({
  organizationLogo,
  organizationName,
}: {
  organizationLogo?: string | null;
  organizationName?: string;
}) {
  const pathname = usePathname();

  if (isMobileNavRoute(pathname)) {
    return (
      <Link
        href="/dashboard"
        className="flex items-center gap-2 md:hidden transition-transform active:scale-95 shrink-0"
        aria-label={organizationName ?? "Início"}
      >
        {organizationLogo ? (
          <Avatar className="size-8 rounded-lg ring-1 ring-border/60 shrink-0">
            <AvatarImage
              src={organizationLogo}
              alt={organizationName ?? "Logo da igreja"}
              className="object-cover rounded-lg"
            />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
              {(organizationName ?? "OM").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-border/60 shrink-0">
            <Image
              src="/icon.png"
              alt="OpenMinistry"
              width={20}
              height={20}
              className="size-5 rounded"
            />
          </div>
        )}
      </Link>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      size="icon-sm"
      aria-label="Voltar"
      title="Voltar"
      className="-ml-1 size-9 shrink-0 md:hidden"
    >
      <Link href={getParentHref(pathname)}>
        <ArrowLeftIcon className="size-5" />
      </Link>
    </Button>
  );
}

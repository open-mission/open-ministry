"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import {
  getParentHref,
  isMobileNavRoute,
} from "@/components/app/nav-config";
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organizationLogo}
            alt={organizationName ?? "Logo da igreja"}
            className="size-8 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
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

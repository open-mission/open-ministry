"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { MobileMenuTrigger } from "@/components/app/mobile-menu";
import {
  getParentHref,
  isMobileNavRoute,
} from "@/components/app/nav-config";
import { Button } from "@/components/ui/button";

export function MobileHeaderLeading() {
  const pathname = usePathname();

  if (isMobileNavRoute(pathname)) {
    return <MobileMenuTrigger />;
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

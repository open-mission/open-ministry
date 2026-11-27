"use client";

import Link from "next/link";
import { SettingsIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarSettingsButton() {
  return (
    <SidebarMenu className="mb-1">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Configurações"
          size="default"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Link href="/settings" prefetch={true}>
            <SettingsIcon className="size-4 shrink-0" />
            <span>Configurações</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

"use client";

import { SettingsIcon } from "lucide-react";

import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarSettingsButton() {
  const { openSettings } = useSettingsModal();

  return (
    <SidebarMenu className="mb-1">
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={openSettings}
          tooltip="Configurações"
          size="default"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <SettingsIcon className="size-4 shrink-0" />
          <span>Configurações</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

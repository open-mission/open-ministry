"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeftIcon,
  BellIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";

import { SignOutConfirmDialog } from "@/components/app/sign-out-confirm-dialog";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useDeviceSessions } from "@/hooks/use-device-sessions";
import { getInitials, roleLabel } from "@/lib/format";

export function NavUser({
  user,
  role,
}: {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  role: string;
}) {
  const { isMobile } = useSidebar();
  const { openSettings } = useSettingsModal();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Consulta as sessões ativas no dispositivo usando o hook do multiSession
  const { sessions: deviceSessions } = useDeviceSessions();

  const otherSessions = (deviceSessions ?? []).filter(
    (s) => s.user.email !== user.email,
  );

  const handleSwitchSession = async (
    sessionToken: string,
    targetName: string,
  ) => {
    if (switching) return;
    setSwitching(true);
    toast.loading(`Alternando para ${targetName}...`, {
      id: "switch-account",
    });
    try {
      const res = await authClient.multiSession.setActive({ sessionToken });
      if (res?.error) {
        toast.error(res.error.message || "Erro ao alternar conta.", {
          id: "switch-account",
        });
        setSwitching(false);
        return;
      }
      toast.success(`Conectado como ${targetName}!`, { id: "switch-account" });
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao alternar conta.", {
        id: "switch-account",
      });
      setSwitching(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                <Avatar className="size-9 rounded-lg">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{user.name}</span>
                    <span
                      className="inline-flex size-2 rounded-full bg-emerald-500"
                      title="Conta ativa"
                    />
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                  <span className="mt-0.5 inline-block text-[10px] font-medium uppercase tracking-wider text-primary">
                    {roleLabel(role)}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            {/* Outras contas conectadas no mesmo dispositivo */}
            {otherSessions.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Alternar Conta
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {otherSessions.map((s) => (
                    <DropdownMenuItem
                      key={s.session.token}
                      disabled={switching}
                      onClick={() =>
                        handleSwitchSession(s.session.token, s.user.name)
                      }
                      className="flex cursor-pointer items-center gap-2.5 px-2 py-2"
                    >
                      <Avatar className="size-7 rounded-lg">
                        <AvatarImage
                          src={s.user.image ?? undefined}
                          alt={s.user.name}
                        />
                        <AvatarFallback className="rounded-lg bg-muted text-[10px] font-medium">
                          {getInitials(s.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-xs leading-tight">
                        <span className="truncate font-medium">
                          {s.user.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {s.user.email}
                        </span>
                      </div>
                      <ArrowRightLeftIcon className="size-3.5 text-muted-foreground shrink-0" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            ) : null}

            <DropdownMenuSeparator />

            {/* Opção para conectar outra conta */}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href="/login?redirect=/dashboard"
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <UserPlusIcon className="size-4" />
                  <span>Conectar outra conta</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer gap-2">
                  <UserIcon className="size-4" />
                  <span>Meu perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={openSettings}
                className="cursor-pointer gap-2"
              >
                <SettingsIcon className="size-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/notifications"
                  prefetch={true}
                  className="cursor-pointer gap-2"
                >
                  <BellIcon className="size-4" />
                  <span>Notificações</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowSignOutConfirm(true);
              }}
              className="flex w-full items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOutIcon className="size-4" />
              <span>Sair da conta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <SignOutConfirmDialog
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
      />
    </SidebarMenu>
  );
}

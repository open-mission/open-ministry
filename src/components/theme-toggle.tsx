"use client";

import { useState, useSyncExternalStore } from "react";
import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const themeOptions = [
  {
    value: "system",
    label: "Sistema",
    description: "Segue o tema do seu dispositivo.",
    icon: MonitorIcon,
  },
  {
    value: "light",
    label: "Claro",
    description: "Papel creme e verde floresta.",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Ideal para ambientes com pouca luz.",
    icon: MoonIcon,
  },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const isDark = mounted && resolvedTheme === "dark";
  const label = isMobile
    ? "Ajustar tema"
    : isDark
      ? "Ativar tema claro"
      : "Ativar tema escuro";

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={
        isMobile ? undefined : () => setTheme(isDark ? "light" : "dark")
      }
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );

  if (!isMobile) {
    return button;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{button}</DrawerTrigger>
      <DrawerContent className="gap-0 rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
        <DrawerHeader className="px-5 pt-1 pb-3 text-left">
          <DrawerTitle className="font-heading text-lg tracking-tight">
            Aparência
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            Escolha como o OpenMinistry aparece neste dispositivo.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {themeOptions.map((option) => {
            const selected = mounted && theme === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-muted/60",
                  selected ? "bg-primary/[0.06]" : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      selected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

"use client";

import { useEffect } from "react";
import {
  ArrowRightIcon,
  BellIcon,
  CheckSquare2Icon,
  KanbanIcon,
  LayoutDashboardIcon,
  RocketIcon,
  SmartphoneIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  releaseNotesStore,
  useReleaseNotesStore,
} from "@/lib/release-notes-store";
import type { ReleaseFeature } from "@/config/release-notes";

export function ReleaseNotesModal() {
  const { isOpen, activeRelease } = useReleaseNotesStore();
  const isMobile = useIsMobile();

  // Verifica na primeira renderização se há uma nova versão que ainda não foi exibida
  useEffect(() => {
    releaseNotesStore.checkAutoOpen();
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      releaseNotesStore.close();
    }
  };

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3.5 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RocketIcon className="size-4" />
              </span>
              <Badge variant="secondary" className="text-[11px] font-semibold h-5 px-2">
                v{activeRelease.version} • Novidades
              </Badge>
            </div>
            <DrawerTitle className="font-heading text-lg font-semibold tracking-tight text-foreground text-left">
              {activeRelease.title}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground text-left leading-relaxed">
              {activeRelease.subtitle}
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[75vh] overflow-y-auto px-5 py-4 pb-6 space-y-3 [-webkit-overflow-scrolling:touch]">
            <FeaturesList features={activeRelease.features} />
          </div>

          <DrawerFooter className="border-t px-5 py-3">
            <Button
              type="button"
              onClick={() => releaseNotesStore.close()}
              className="w-full gap-2 font-semibold min-h-[44px]"
            >
              <span>Explorar novidades</span>
              <ArrowRightIcon className="size-4" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="space-y-2.5 text-left border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RocketIcon className="size-4" />
            </span>
            <Badge variant="secondary" className="text-[11px] font-semibold h-5 px-2">
              v{activeRelease.version} • O que há de novo
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {activeRelease.releaseDate}
            </span>
          </div>
          <DialogTitle className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground text-left">
            {activeRelease.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-left">
            {activeRelease.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <FeaturesList features={activeRelease.features} />
        </div>

        <DialogFooter className="border-t pt-4 sm:justify-end">
          <Button
            type="button"
            onClick={() => releaseNotesStore.close()}
            className="gap-2 font-semibold"
          >
            <span>Explorar novidades</span>
            <ArrowRightIcon className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeaturesList({ features }: { features: ReleaseFeature[] }) {
  return (
    <div className="space-y-2.5">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-2xs transition-colors hover:border-border"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 mt-0.5">
            {getFeatureIcon(feature.iconName)}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {feature.title}
              </p>
              {feature.badge && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4.5 px-1.5 font-medium border-primary/30 bg-primary/5 text-primary"
                >
                  {feature.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getFeatureIcon(iconName: string) {
  switch (iconName) {
    case "CheckSquare2Icon":
      return <CheckSquare2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />;
    case "LayoutDashboardIcon":
      return <LayoutDashboardIcon className="size-4 text-primary" />;
    case "KanbanIcon":
      return <KanbanIcon className="size-4 text-indigo-500" />;
    case "SmartphoneIcon":
      return <SmartphoneIcon className="size-4 text-sky-500" />;
    case "BellIcon":
      return <BellIcon className="size-4 text-amber-500" />;
    default:
      return <SparklesIcon className="size-4 text-primary" />;
  }
}

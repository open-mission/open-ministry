"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";

import {
  getMyAvailabilityAction,
  getMyUnavailabilitiesAction,
} from "@/app/actions/availability";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { UnavailabilitySection } from "@/components/availability/unavailability-section";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  MyAvailabilityResult,
  PersonUnavailabilityItem,
} from "@/lib/availability";

export type AvailabilityPanelData = {
  availability: MyAvailabilityResult;
  unavailabilities: PersonUnavailabilityItem[];
};

/**
 * Carrega sob demanda a disponibilidade semanal e datas pontuais usando as
 * server actions existentes (que validam `schedules:manageOwnAvailability` no
 * servidor) sem disparar efeitos síncronos.
 */
export function useAvailabilityPanelData(
  initialData: AvailabilityPanelData | null = null,
) {
  const [data, setData] = useState<AvailabilityPanelData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [availability, unavailabilities] = await Promise.all([
        getMyAvailabilityAction(),
        getMyUnavailabilitiesAction(),
      ]);
      if (!availability) {
        setError("Não foi possível carregar sua disponibilidade.");
      } else {
        setData({ availability, unavailabilities });
      }
    } catch {
      setError("Não foi possível carregar sua disponibilidade.");
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureLoaded = useCallback(() => {
    if (!data && !loading) {
      void reload();
    }
  }, [data, loading, reload]);

  const markSaved = useCallback((updatedAt: Date) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            availability: {
              ...prev.availability,
              hasSaved: true,
              updatedAt,
            },
          }
        : prev,
    );
  }, []);

  return { data, loading, error, reload, ensureLoaded, markSaved };
}

type AvailabilitySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AvailabilityPanelData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSaved?: (updatedAt: Date) => void;
};

/**
 * Painel de configuração da disponibilidade semanal ("do dia a dia") e datas
 * pontuais. No desktop abre como Sheet lateral direita ocupando 50% da tela;
 * no mobile, como Drawer independente.
 */
export function AvailabilitySheet({
  open,
  onOpenChange,
  data,
  loading = false,
  error = null,
  onRetry,
  onSaved,
}: AvailabilitySheetProps) {
  const isMobile = useIsMobile();
  const router = useRouter();

  const handleSaved = useCallback(
    (updatedAt: Date) => {
      onSaved?.(updatedAt);
      router.refresh();
    },
    [onSaved, router],
  );

  const body = loading ? (
    <div className="space-y-6" aria-label="Carregando disponibilidade">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  ) : error ? (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-card px-5 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircleIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Verifique sua conexão e tente novamente.
        </p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="min-h-11 gap-1.5 sm:min-h-9"
        >
          <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  ) : data ? (
    <div className="space-y-8">
      <AvailabilityEditor
        initialData={data.availability}
        embedded
        onSaved={handleSaved}
      />
      <UnavailabilitySection initialItems={data.unavailabilities} />
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[85dvh] flex-col rounded-t-xl border-x-0 border-b-0 bg-popover p-0">
          <DrawerHeader className="border-b bg-card/50 px-5 pt-4 pb-3 !text-left">
            <DrawerTitle className="font-heading text-xl leading-snug tracking-tight">
              Disponibilidade do dia a dia
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Informe seus horários semanais e datas em que não poderá servir.
            </DrawerDescription>
          </DrawerHeader>

          <div
            data-vaul-no-drag=""
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-5 py-4"
          >
            {body}
          </div>

          <DrawerFooter className="border-t bg-card px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <DrawerClose asChild>
              <Button variant="outline" className="h-11 w-full rounded-xl">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full min-w-0 flex-col gap-0 p-0 data-[side=right]:md:!w-1/2 data-[side=right]:md:!max-w-[50vw]"
      >
        <SheetHeader className="space-y-1.5 border-b bg-card/50 px-6 py-4 pr-12 text-left">
          <SheetTitle className="font-heading text-2xl leading-snug tracking-tight text-foreground">
            Disponibilidade do dia a dia
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Informe em quais dias e períodos costuma servir. A liderança usa
            esses horários para montar as escalas.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{body}</div>
      </SheetContent>
    </Sheet>
  );
}

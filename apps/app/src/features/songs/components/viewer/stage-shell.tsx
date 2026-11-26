"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Minimize2Icon, Music2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStageWakeLock } from "./use-stage-wake-lock";

type StageShellProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  artist?: string;
  /** Controles extras exibidos abaixo do título (tom, fonte, rolagem...). */
  toolbar?: ReactNode;
  children: ReactNode;
  /** Container rolável — usado pela rolagem automática. */
  contentRef?: RefObject<HTMLDivElement | null>;
  /** Desativa a armadilha de foco quando um Dialog (ajuda) está por cima. */
  trapFocus?: boolean;
  /** Permite que o consumidor decida o que fazer no Esc (ex.: fechar ajuda). */
  onEscape?: () => void;
};

/**
 * Casca única do Modo Palco: tela cheia, WakeLock, Esc, foco preso e UM único
 * botão "Sair" no header. A antiga bolha "X" flutuante foi removida para não
 * colidir com o header no mobile.
 */
export function StageShell({
  open,
  onClose,
  title,
  artist,
  toolbar,
  children,
  contentRef,
  trapFocus = true,
  onEscape,
}: StageShellProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useStageWakeLock(open);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    const previous = document.activeElement as HTMLElement | null;
    previouslyFocusedRef.current = previous;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget =
      container?.querySelector<HTMLElement>("[data-autofocus]") ?? container;
    const animationFrame = window.requestAnimationFrame(() => {
      focusTarget?.focus();
    });

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !container || !trapFocus) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (active === first || !container.contains(active))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !container.contains(active))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleTab);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [open, trapFocus]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (onEscape) onEscape();
      else onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose, onEscape]);

  if (!open || !isClient) return null;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-100 flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-contain bg-background text-foreground select-text focus:outline-none"
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-border/70 bg-card/95 px-3 py-2 shadow-xs backdrop-blur-xs sm:px-5 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
              <Music2Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate font-heading text-sm font-bold text-foreground sm:text-base"
              >
                {title || "Modo Palco"}
              </h2>
              {artist ? (
                <p className="truncate text-xs text-muted-foreground">
                  {artist}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="min-h-11 shrink-0 gap-1.5 px-3 text-xs font-semibold shadow-2xs sm:min-h-9 sm:px-3.5"
            aria-label="Sair do modo palco (Esc)"
          >
            <Minimize2Icon className="size-4" />
            <span>Sair</span>
            <kbd className="hidden rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[11px] sm:inline">
              ESC
            </kbd>
          </Button>
        </div>

        {toolbar}
      </div>

      <div
        ref={contentRef}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 focus-visible:outline-none sm:p-6 lg:p-8 [-webkit-overflow-scrolling:touch]"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

"use client";

import type { FormEvent, ReactNode } from "react";
import {
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  Music2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SongFormShellProps = {
  open: boolean;
  isMobile: boolean;
  isEditing: boolean;
  isMaximized: boolean;
  isDirty: boolean;
  isPending: boolean;
  onRequestClose: (nextOpen: boolean) => void;
  onShowDiscardAlert: () => void;
  onToggleMaximized: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
};

export function SongFormShell({
  open,
  isMobile,
  isEditing,
  isMaximized,
  isDirty,
  isPending,
  onRequestClose,
  onShowDiscardAlert,
  onToggleMaximized,
  onSubmit,
  children,
}: SongFormShellProps) {
  const titleText = isEditing ? "Editar Música" : "Nova Música no Repertório";

  const formBody = (
    <form
      onSubmit={onSubmit}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    >
      {/* 1. HEADER DO FORMULÁRIO */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Music2Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-bold tracking-tight text-foreground sm:text-lg">
              {titleText}
            </h2>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {isEditing
                ? "Edite metadados, tom, letra, cifra e plataformas."
                : "Cadastre letras, cifras e links para a equipe de louvor."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* BOTÃO MAXIMIZAR / RESTAURAR (DESKTOP) */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleMaximized}
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            title={
              isMaximized
                ? "Restaurar tamanho da janela"
                : "Maximizar para tela cheia"
            }
          >
            {isMaximized ? (
              <Minimize2Icon className="size-4" />
            ) : (
              <Maximize2Icon className="size-4" />
            )}
            <span className="sr-only">
              {isMaximized ? "Restaurar tamanho" : "Maximizar tela"}
            </span>
          </Button>

          {/* ÚNICO BOTÃO DE FECHAR (X) */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRequestClose(false)}
            className="text-muted-foreground hover:text-foreground"
            title="Fechar"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </div>

      {/* 2. TABS */}
      {children}

      {/* 3. FOOTER FIXO DO FORMULÁRIO */}
      <div className="flex shrink-0 flex-row items-center justify-between border-t border-border/70 bg-card/95 backdrop-blur-xs px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="size-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />
              Alterações não salvas
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              Tudo salvo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRequestClose(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="gap-1.5 font-semibold"
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : null}
            {isEditing ? "Salvar alterações" : "Adicionar ao repertório"}
          </Button>
        </div>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onRequestClose}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-none border-0 bg-background p-0"
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
              onShowDiscardAlert();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
              onShowDiscardAlert();
            }
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{titleText}</SheetTitle>
            <SheetDescription>
              Formulário completo de edição de músicas e cifras.
            </SheetDescription>
          </SheetHeader>
          {formBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onRequestClose}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden bg-background p-0 duration-150",
          isMaximized
            ? "fixed top-0 left-0 translate-x-0 translate-y-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none sm:max-w-none xl:max-w-none rounded-none border-0 ring-0"
            : "h-[92vh] max-h-[92vh] min-h-0 sm:max-w-5xl xl:max-w-6xl rounded-2xl border border-border/80 shadow-2xl",
        )}
        onPointerDownOutside={(e) => {
          if (isDirty) {
            e.preventDefault();
            onShowDiscardAlert();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isDirty) {
            e.preventDefault();
            onShowDiscardAlert();
          }
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>
            Formulário completo de edição de músicas e cifras.
          </DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

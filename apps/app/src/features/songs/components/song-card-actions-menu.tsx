"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarPlusIcon,
  FileTextIcon,
  FolderIcon,
  MoreVerticalIcon,
  Music2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SongWithUsage } from "@/lib/songs";

type SongCardActionsMenuProps = {
  song: SongWithUsage;
  canManage: boolean;
  canAddToNextService: boolean;
  isAddingToPlan: boolean;
  onAddToNextService: () => void;
  onEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
};

export function SongCardActionsMenu({
  song,
  canManage,
  canAddToNextService,
  isAddingToPlan,
  onAddToNextService,
  onEdit,
  onGroup,
  onDelete,
}: SongCardActionsMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!canManage && !canAddToNextService) return null;

  const closeThen = (action: () => void) => {
    setOpen(false);
    action();
  };

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 text-muted-foreground md:size-8"
      aria-label="Opções da música"
      title="Opções da música"
    >
      <MoreVerticalIcon className="size-4" />
    </Button>
  );

  const addToPlanButton = (
    <button
      type="button"
      onClick={() => closeThen(onAddToNextService)}
      disabled={isAddingToPlan}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
    >
      <CalendarPlusIcon className="size-4 text-muted-foreground" />
      <span>
        {isAddingToPlan ? "Adicionando..." : "Adicionar ao próximo culto"}
      </span>
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85dvh] rounded-t-xl bg-popover p-0">
          <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left! group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Music2Icon className="size-4" />
              </span>
              <DrawerTitle className="truncate text-left font-heading text-base font-bold">
                {song.title}
              </DrawerTitle>
            </div>
            <DrawerDescription className="truncate text-left text-xs text-muted-foreground">
              {song.artist || "Opções da música"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-1 p-3">
            <Button
              variant="ghost"
              asChild
              className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
            >
              <Link
                href={`/songs/${song.id}`}
                prefetch={true}
                onClick={() => setOpen(false)}
              >
                <FileTextIcon className="size-4 text-muted-foreground" />
                <span>Ver detalhes</span>
              </Link>
            </Button>

            {canManage ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => closeThen(onEdit)}
                  className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                >
                  <PencilIcon className="size-4 text-muted-foreground" />
                  <span>Editar música</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => closeThen(onGroup)}
                  className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium"
                >
                  <FolderIcon className="size-4 text-muted-foreground" />
                  <span>Definir grupo</span>
                </Button>
              </>
            ) : null}

            {canAddToNextService ? addToPlanButton : null}

            {canManage ? (
              <>
                <div className="my-1 border-t border-border/60" />
                <Button
                  variant="ghost"
                  onClick={() => closeThen(onDelete)}
                  className="h-11 justify-start gap-3 rounded-xl px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  <span>Excluir</span>
                </Button>
              </>
            ) : null}
          </div>

          <DrawerFooter className="border-t pt-2 pb-4">
            <DrawerClose asChild>
              <Button variant="outline" className="min-h-11 w-full">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={`/songs/${song.id}`} prefetch={true}>
            <FileTextIcon className="mr-2 size-4" />
            Ver detalhes
          </Link>
        </DropdownMenuItem>
        {canManage ? (
          <>
            <DropdownMenuItem onClick={() => closeThen(onEdit)}>
              <PencilIcon className="mr-2 size-4" />
              Editar música
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => closeThen(onGroup)}>
              <FolderIcon className="mr-2 size-4" />
              Definir grupo
            </DropdownMenuItem>
          </>
        ) : null}
        {canAddToNextService ? (
          <DropdownMenuItem
            onClick={() => closeThen(onAddToNextService)}
            disabled={isAddingToPlan}
          >
            <CalendarPlusIcon className="mr-2 size-4" />
            {isAddingToPlan ? "Adicionando..." : "Adicionar ao próximo culto"}
          </DropdownMenuItem>
        ) : null}
        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => closeThen(onDelete)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="mr-2 size-4" />
              Excluir
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

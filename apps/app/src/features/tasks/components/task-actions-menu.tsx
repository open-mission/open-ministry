"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  EyeIcon,
  HistoryIcon,
  MoreVerticalIcon,
  PencilIcon,
  PinIcon,
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
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  deleteTaskAction,
  toggleTaskPinAction,
} from "../actions/tasks.actions";
import type { TaskItem } from "../services/tasks-service";

export type TaskActionsMenuProps = {
  task: TaskItem;
  onView?: (task: TaskItem) => void;
  onEdit?: (task: TaskItem) => void;
  onOpenAudit?: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  onPinToggled?: (isPinned: boolean) => void;
  canManage?: boolean;
  triggerClassName?: string;
  isNestedInDrawer?: boolean;
};

export function TaskActionsMenu({
  task,
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onPinToggled,
  canManage = true,
  triggerClassName = "size-7 text-muted-foreground hover:text-foreground",
  isNestedInDrawer = false,
}: TaskActionsMenuProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleTogglePin = () => {
    startTransition(async () => {
      const res = await toggleTaskPinAction(task.id);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(
          res.data.isPinned ? "Tarefa fixada no topo." : "Tarefa desafixada.",
        );
        onPinToggled?.(res.data.isPinned);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Deseja realmente remover a tarefa "${task.title}"?`)) {
      return;
    }
    onDelete?.(task.id);
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Tarefa removida com sucesso.");
      }
    });
  };

  if (isMobile) {
    const DrawerRoot = isNestedInDrawer ? DrawerNestedRoot : Drawer;

    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName}
          onClick={(e) => {
            e.stopPropagation();
            setDrawerOpen(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Opções da tarefa"
          aria-label="Opções da tarefa"
        >
          <MoreVerticalIcon className="size-4" />
        </Button>

        <DrawerRoot open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="p-0">
            <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle className="truncate font-heading text-base font-semibold">
                {task.title}
              </DrawerTitle>
              <DrawerDescription className="!text-left text-xs text-muted-foreground">
                Opções e ações da tarefa
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col p-2 space-y-1">
              {onView && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onView(task);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted"
                >
                  <EyeIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span>Visualizar Detalhes</span>
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onEdit(task);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted"
                >
                  <PencilIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span>Editar Detalhes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  handleTogglePin();
                }}
                disabled={isPending}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted disabled:opacity-50"
              >
                <PinIcon className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  {task.isPinned ? "Desafixar do topo" : "Fixar no topo"}
                </span>
              </button>

              {onOpenAudit && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAudit(task);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted"
                >
                  <HistoryIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span>Ver Histórico de Auditoria</span>
                </button>
              )}

              {canManage && onDelete && (
                <>
                  <div className="my-1 border-t border-border/60" />
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      handleDelete();
                    }}
                    disabled={isPending}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15 disabled:opacity-50"
                  >
                    <Trash2Icon className="size-4 shrink-0" />
                    <span>Excluir Tarefa</span>
                  </button>
                </>
              )}
            </div>

            <DrawerFooter className="pt-2 pb-4 px-4">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full min-h-[44px]">
                  Fechar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </DrawerRoot>
      </>
    );
  }

  // Desktop: DropdownMenu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="Mais opções da tarefa"
        >
          <MoreVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        {onView && (
          <DropdownMenuItem onClick={() => onView(task)}>
            Visualizar Detalhes
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(task)}>
            Editar Detalhes
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleTogglePin} disabled={isPending}>
          <PinIcon className="mr-2 size-3.5" />
          {task.isPinned ? "Desafixar do topo" : "Fixar no topo"}
        </DropdownMenuItem>
        {onOpenAudit && (
          <DropdownMenuItem onClick={() => onOpenAudit(task)}>
            <HistoryIcon className="mr-2 size-3.5" />
            Ver Auditoria
          </DropdownMenuItem>
        )}
        {canManage && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2Icon className="mr-2 size-3.5" />
              Excluir Tarefa
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

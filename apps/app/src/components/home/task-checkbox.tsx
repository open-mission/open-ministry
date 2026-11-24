"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { updateTaskStatusAction } from "@/features/tasks/actions/tasks.actions";
import type { TaskStatus } from "@/features/tasks/services/tasks-service";
import { cn } from "@/lib/utils";

/** Janela de arrependimento do toast de conclusão de tarefa. */
export const TASK_UNDO_WINDOW_MS = 8000;

export function TaskCheckbox({
  taskId,
  initialStatus,
  label,
  className,
  onStatusChange,
}: {
  taskId: string;
  initialStatus: TaskStatus;
  label: string;
  className?: string;
  onStatusChange?: (nextStatus: TaskStatus) => void;
}) {
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [, startTransition] = useTransition();

  const checked = status === "completed";

  const applyStatus = (nextStatus: TaskStatus) => {
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  };

  const persistStatus = async (nextStatus: TaskStatus, previous: TaskStatus) => {
    const result = await updateTaskStatusAction(taskId, nextStatus);

    if (!result.ok) {
      // O card pode ter removido a tarefa da lista durante a atualização
      // otimista; restaura o status anterior para que ela volte a aparecer.
      applyStatus(previous);
      toast.error(result.error ?? "Não foi possível atualizar a tarefa.");
      return false;
    }

    return true;
  };

  const handleCheckedChange = (nextChecked: boolean) => {
    const previous = status;
    const nextStatus: TaskStatus = nextChecked ? "completed" : "todo";

    applyStatus(nextStatus);

    startTransition(async () => {
      const saved = await persistStatus(nextStatus, previous);

      if (!saved) {
        return;
      }

      if (nextStatus !== "completed") {
        toast.success("Tarefa reaberta.");
        return;
      }

      toast("Tarefa concluída", {
        duration: TASK_UNDO_WINDOW_MS,
        action: {
          label: "Desfazer",
          onClick: () => {
            applyStatus(previous);

            startTransition(async () => {
              const reverted = await updateTaskStatusAction(taskId, previous);

              if (!reverted.ok) {
                applyStatus(nextStatus);
                toast.error(
                  reverted.error ?? "Não foi possível desfazer a conclusão.",
                );
                return;
              }

              toast.success("Tarefa reaberta.");
            });
          },
        },
      });
    });
  };

  return (
    <span className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => handleCheckedChange(value === true)}
        aria-label={`${checked ? "Reabrir" : "Concluir"} tarefa: ${label}`}
        className={cn(
          "relative size-5 shrink-0 rounded-full after:absolute after:-inset-3 after:content-['']",
          className,
        )}
      />
    </span>
  );
}

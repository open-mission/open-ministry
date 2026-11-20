"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { updateTaskStatusAction } from "@/features/tasks/actions/tasks.actions";
import type { TaskStatus } from "@/features/tasks/services/tasks-service";
import { cn } from "@/lib/utils";

export function TaskCheckbox({
  taskId,
  initialStatus,
  label,
  className,
}: {
  taskId: string;
  initialStatus: TaskStatus;
  label: string;
  className?: string;
}) {
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [, startTransition] = useTransition();

  const checked = status === "completed";

  const handleCheckedChange = (nextChecked: boolean) => {
    const nextStatus: TaskStatus = nextChecked ? "completed" : "todo";
    setStatus(nextStatus);

    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, nextStatus);
      if (!result.ok) {
        setStatus(status);
        toast.error(result.error ?? "Não foi possível atualizar a tarefa.");
        return;
      }
      toast.success(
        nextChecked ? "Tarefa concluída!" : "Tarefa reaberta.",
      );
    });
  };

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => handleCheckedChange(value === true)}
      aria-label={`${checked ? "Reabrir" : "Concluir"} tarefa: ${label}`}
      className={cn(
        "relative size-5 shrink-0 after:absolute after:-inset-1.5 after:content-['']",
        className,
      )}
    />
  );
}

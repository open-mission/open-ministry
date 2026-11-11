"use client";

import { useTransition } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { removeScheduleAssignmentAction } from "@/app/actions/events";

export function RemoveAssignmentButton({
  assignmentId,
  userName,
  functionName,
  onRemove,
  onRollback,
}: {
  assignmentId: string;
  userName: string;
  functionName: string;
  onRemove?: () => void;
  onRollback?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    onRemove?.();
    startTransition(async () => {
      const result = await removeScheduleAssignmentAction(assignmentId);

      if (result.ok) {
        toast.success("Pessoa removida da escala.");
        return;
      }

      onRollback?.();
      toast.error(result.error ?? "Não foi possível remover da escala.");
    });
  }

  return (
    <button
      type="button"
      className="relative ml-0.5 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-2 after:rounded-full after:content-[''] hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
      aria-label={`Remover ${userName} de ${functionName}`}
      title={`Remover ${userName} de ${functionName}`}
      disabled={pending}
      onClick={handleRemove}
    >
      <XIcon className="size-3.5" />
    </button>
  );
}

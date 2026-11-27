"use client";

import { ClockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DeadlinePreset } from "./task-form.types";

type TaskDeadlineSectionProps = {
  deadlinePreset: DeadlinePreset;
  deadline: string;
  onSelectPreset: (preset: DeadlinePreset) => void;
  onDeadlineChange: (value: string) => void;
};

const DEADLINE_CHIPS: ReadonlyArray<{ key: DeadlinePreset; label: string }> = [
  { key: "none", label: "Sem prazo" },
  { key: "today", label: "Hoje" },
  { key: "tomorrow", label: "Amanhã" },
  { key: "sunday", label: "Próx. domingo" },
  { key: "custom", label: "Escolher data" },
];

export function TaskDeadlineSection({
  deadlinePreset,
  deadline,
  onSelectPreset,
  onDeadlineChange,
}: TaskDeadlineSectionProps) {
  return (
    <div className="space-y-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <ClockIcon className="size-3.5 text-muted-foreground" />
        Prazo de entrega
      </span>
      <div className="flex flex-wrap gap-1.5">
        {DEADLINE_CHIPS.map((chip) => (
          <Button
            key={chip.key}
            type="button"
            size="sm"
            variant={deadlinePreset === chip.key ? "default" : "outline"}
            className="min-h-9.5 sm:min-h-8"
            onClick={() => onSelectPreset(chip.key)}
          >
            {chip.label}
          </Button>
        ))}
      </div>

      {deadlinePreset !== "none" || deadline ? (
        <div className="pt-1">
          <Label
            htmlFor="task-deadline"
            className="text-xs text-muted-foreground"
          >
            Data e hora limite
          </Label>
          <Input
            id="task-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => onDeadlineChange(e.target.value)}
            className="mt-1 min-h-11"
          />
        </div>
      ) : null}
    </div>
  );
}

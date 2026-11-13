"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DepartmentOption } from "@/lib/departments";
import { cn } from "@/lib/utils";

export function DepartmentCheckboxRow({
  department,
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  selectedFunctionIds = [],
  onFunctionToggle,
  onSelectAllFunctions,
  onDeselectAllFunctions,
  // Backward compatibility fallback props:
  value: legacyValue,
  label: legacyLabel,
}: {
  department?: DepartmentOption;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  selectedFunctionIds?: string[];
  onFunctionToggle?: (functionId: string) => void;
  onSelectAllFunctions?: () => void;
  onDeselectAllFunctions?: () => void;
  value?: string;
  label?: string;
}) {
  const departmentId = department?.id ?? legacyValue ?? "";
  const departmentName = department?.name ?? legacyLabel ?? "";
  const functions = department?.functions ?? [];
  const hasFunctions = functions.length > 0;

  const [uncontrolledChecked, setUncontrolledChecked] =
    useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : uncontrolledChecked;

  const setChecked = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledChecked(next);
    }
    onCheckedChange?.(next);
  };

  const selectedCount = selectedFunctionIds.length;
  const checkboxId = useId();

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        checked
          ? "border-primary/30 bg-card shadow-2xs"
          : "border-border/60 bg-muted/20 hover:bg-muted/40",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-center gap-2.5 text-sm font-medium transition-colors select-none"
        >
          <Checkbox
            id={checkboxId}
            name="departments"
            value={departmentId}
            checked={checked}
            onCheckedChange={(next) => setChecked(next === true)}
          />
          <span className="text-foreground">{departmentName}</span>
        </label>

        {checked && hasFunctions ? (
          <Badge
            variant={selectedCount === 0 ? "destructive" : "secondary"}
            className="text-[0.7rem] font-normal"
          >
            {selectedCount === functions.length
              ? `Todas (${functions.length})`
              : `${selectedCount} de ${functions.length} funções`}
          </Badge>
        ) : null}
      </div>

      {checked ? (
        hasFunctions ? (
          <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5 pl-6">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="text-[0.75rem]">Funções que atuarão:</span>
              <div className="flex items-center gap-1.5 text-[0.75rem]">
                <button
                  type="button"
                  onClick={onSelectAllFunctions}
                  className="font-medium text-primary hover:underline"
                >
                  Todas
                </button>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <button
                  type="button"
                  onClick={onDeselectAllFunctions}
                  className="text-muted-foreground hover:underline"
                >
                  Nenhuma
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {functions.map((fn) => {
                const isSelected = selectedFunctionIds.includes(fn.id);
                return (
                  <label
                    key={fn.id}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors select-none",
                      isSelected
                        ? "border-primary/40 bg-primary/10 text-primary font-medium shadow-2xs"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      name="functions"
                      value={fn.id}
                      checked={isSelected}
                      onCheckedChange={() => onFunctionToggle?.(fn.id)}
                      className="size-3.5 rounded-sm"
                    />
                    <span>{fn.name}</span>
                  </label>
                );
              })}
            </div>

            {selectedCount === 0 ? (
              <p className="text-[0.75rem] font-medium text-amber-600 dark:text-amber-400">
                Selecione pelo menos uma função ou desmarque o departamento.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground pl-6">
            Nenhuma função cadastrada neste departamento.
          </p>
        )
      ) : null}
    </div>
  );
}

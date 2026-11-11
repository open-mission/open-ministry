"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";

export function DepartmentCheckboxRow({
  value,
  label,
  defaultChecked = false,
  checked: controlledChecked,
  onCheckedChange,
}: {
  value: string;
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
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

  return (
    <label
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors select-none hover:bg-muted/50"
      onClick={(event) => {
        event.preventDefault();

        const target = event.target as HTMLElement;

        if (target.closest('[data-slot="checkbox"]')) {
          return;
        }

        setChecked(!checked);
      }}
    >
      <Checkbox
        name="departments"
        value={value}
        checked={checked}
        onCheckedChange={(next) => setChecked(next === true)}
      />
      {label}
    </label>
  );
}

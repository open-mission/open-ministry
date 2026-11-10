"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";

export function DepartmentCheckboxRow({
  value,
  label,
  defaultChecked = false,
}: {
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors select-none hover:bg-muted/50"
      onClick={(event) => {
        event.preventDefault();

        const target = event.target as HTMLElement;

        if (target.closest('[data-slot="checkbox"]')) {
          return;
        }

        setChecked((current) => !current);
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

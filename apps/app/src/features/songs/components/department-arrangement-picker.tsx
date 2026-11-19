"use client";

import { NativeSelect } from "@/components/ui/native-select";
import type { DepartmentOption } from "@/features/songs/lib/song-arrangements";
import { cn } from "@/lib/utils";

type DepartmentArrangementPickerProps = {
  departments: DepartmentOption[];
  value: string;
  onChange: (departmentId: string) => void;
  id?: string;
  className?: string;
};

/**
 * Seletor de departamento usado no formulário e no visualizador de arranjos.
 * No mobile mantém alvo de toque de 44px; no desktop compacta para 36px.
 */
export function DepartmentArrangementPicker({
  departments,
  value,
  onChange,
  id = "arrangement-department",
  className,
}: DepartmentArrangementPickerProps) {
  if (departments.length === 0) return null;

  return (
    <NativeSelect
      id={id}
      aria-label="Departamento da formação"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "min-h-11 w-full [&>select]:h-full [&>select]:min-h-11 sm:min-h-9 sm:[&>select]:min-h-9",
        className,
      )}
    >
      {departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </NativeSelect>
  );
}

"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import type { PlatformIntegrationView } from "@/app/actions/platform";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SecretFieldInput({
  id,
  label,
  value,
  onChange,
  mask,
  source,
  required,
  placeholderWithMask,
  placeholderEmpty,
  helperText,
  toggleAriaLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  mask: string | null;
  source: PlatformIntegrationView["source"];
  required?: boolean;
  placeholderWithMask: string;
  placeholderEmpty: string;
  helperText: string;
  toggleAriaLabel: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label} {mask ? "(opcional ao manter)" : required ? "*" : "(opcional)"}
        </Label>
        {mask ? (
          <Badge
            variant="secondary"
            className="font-mono text-[11px] font-normal"
          >
            {source === "env" ? `Via .env: ${mask}` : `Salva: ${mask}`}
          </Badge>
        ) : null}
      </div>
      <div className="relative flex items-center">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={mask ? placeholderWithMask : placeholderEmpty}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={Boolean(required && !mask)}
          className="min-h-11 pr-11 font-mono text-xs sm:min-h-9"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? `Ocultar ${toggleAriaLabel}` : `Mostrar ${toggleAriaLabel}`}
          className="absolute right-1 flex min-h-10 min-w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer sm:min-h-8 sm:min-w-8"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

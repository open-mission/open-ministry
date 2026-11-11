"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { CoverageFilter } from "@/lib/events";
import { cn } from "@/lib/utils";

type DepartmentOption = {
  id: string;
  name: string;
};

const coverageOptions: {
  value: CoverageFilter;
  label: string;
  countKey: "attention" | "complete" | "all";
}[] = [
  { value: "attention", label: "Precisam de atenção", countKey: "attention" },
  { value: "complete", label: "Completas", countKey: "complete" },
  { value: "all", label: "Todas", countKey: "all" },
];

export function EventFilters({
  coverage,
  departmentId,
  query,
  departments,
  counts,
  searchPlaceholder = "Buscar por nome ou local",
}: {
  coverage: CoverageFilter;
  departmentId?: string;
  query?: string;
  departments: DepartmentOption[];
  counts: { attention: number; complete: number; all: number };
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(query ?? "");
  const [prevQuery, setPrevQuery] = useState(query);

  if (query !== prevQuery) {
    setPrevQuery(query);
    setTerm(query ?? "");
  }

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const current = query ?? "";

    if (term === current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      updateParams({ q: term.trim() || undefined });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [term, query, updateParams]);

  const hasExtraFilters = Boolean(departmentId || query);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="group"
        aria-label="Filtrar escalas"
        className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
      >
        {coverageOptions.map((option) => {
          const active = coverage === option.value;
          const count = counts[option.countKey];

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => updateParams({ coverage: option.value })}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm",
                active
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] font-semibold",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-background/70 text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar encontros"
            className="h-9 w-full pl-8 sm:w-56 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        {departments.length > 0 ? (
          <NativeSelect
            value={departmentId ?? ""}
            onChange={(event) =>
              updateParams({ department: event.target.value || undefined })
            }
            aria-label="Filtrar por departamento"
            className="w-full sm:w-48 [&_select]:h-9"
          >
            <NativeSelectOption value="">
              Todos os departamentos
            </NativeSelectOption>
            {departments.map((department) => (
              <NativeSelectOption key={department.id} value={department.id}>
                {department.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}

        {hasExtraFilters ? (
          <button
            type="button"
            onClick={() =>
              updateParams({ department: undefined, q: undefined })
            }
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <XIcon className="size-3.5" />
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}

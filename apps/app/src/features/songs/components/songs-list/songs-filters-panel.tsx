"use client";

import { CheckIcon, GuitarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STANDARD_TONES } from "@/lib/music/chords-utils";
import { cn } from "@/lib/utils";
import type { SortOption, StatusFilter } from "./types";

export type SongsFilterStatusOption = {
  value: StatusFilter;
  label: string;
  count?: number;
};

type SongsFiltersPanelProps = {
  toneFilter: string;
  onToneFilterChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (value: SortOption) => void;
  statusOptions: SongsFilterStatusOption[];
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "manual", label: "Ordem manual" },
  { value: "title", label: "Título (A–Z)" },
  { value: "usage", label: "Mais usadas" },
  { value: "updated", label: "Recentes" },
];

const majorTones = STANDARD_TONES.filter((tone) => !tone.endsWith("m"));
const minorTones = STANDARD_TONES.filter((tone) => tone.endsWith("m"));

export function SongsFiltersPanel({
  toneFilter,
  onToneFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  statusOptions,
}: SongsFiltersPanelProps) {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <GuitarIcon className="size-3.5" />
          Tom
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            type="button"
            variant={!toneFilter ? "default" : "outline"}
            size="sm"
            onClick={() => onToneFilterChange("")}
            aria-pressed={!toneFilter}
            className="h-9 min-h-11 rounded-lg px-1 text-xs font-semibold md:h-8 md:min-h-0"
          >
            Todos
          </Button>
          {[...majorTones, ...minorTones].map((tone) => (
            <Button
              key={tone}
              type="button"
              variant={toneFilter === tone ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onToneFilterChange(toneFilter === tone ? "" : tone)
              }
              aria-pressed={toneFilter === tone}
              className="h-9 min-h-11 rounded-lg px-1 text-xs font-semibold md:h-8 md:min-h-0"
            >
              {tone}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Pendências
        </h3>
        <div className="flex flex-col gap-1">
          {statusOptions.map((option) => {
            const isSelected = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusFilterChange(option.value)}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors md:min-h-9",
                  isSelected
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span>{option.label}</span>
                {typeof option.count === "number" ? (
                  <span
                    className={cn(
                      "text-[11px] font-medium tabular-nums",
                      isSelected ? "text-primary/70" : "text-muted-foreground",
                    )}
                  >
                    {option.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Ordenação
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {SORT_OPTIONS.map((option) => {
            const isSelected = sortOption === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortOptionChange(option.value)}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-left text-xs font-medium transition-colors md:min-h-9",
                  isSelected
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {isSelected ? (
                  <CheckIcon className="size-3.5 shrink-0" />
                ) : null}
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

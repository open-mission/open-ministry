"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  GuitarIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STANDARD_TONES } from "@/lib/music/chords-utils";
import { cn } from "@/lib/utils";
import {
  STATUS_LABEL,
  type SortOption,
  type StatusFilter,
} from "./types";

type SongsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  toneFilter: string;
  onToneFilterChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (value: SortOption) => void;
  counts: {
    total: number;
    missingChords: number;
    missingLyrics: number;
    neverUsed: number;
  };
  activeFilterCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "manual", label: "Ordem manual" },
  { value: "title", label: "Título (A–Z)" },
  { value: "usage", label: "Mais usadas" },
  { value: "updated", label: "Recentes" },
];

const majorTones = STANDARD_TONES.filter((tone) => !tone.endsWith("m"));
const minorTones = STANDARD_TONES.filter((tone) => tone.endsWith("m"));

export function SongsToolbar({
  search,
  onSearchChange,
  toneFilter,
  onToneFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  counts,
  activeFilterCount,
  hasActiveFilters,
  onClearFilters,
}: SongsToolbarProps) {
  const statusOptions: { value: StatusFilter; label: string; count?: number }[] =
    [
      { value: "all", label: "Todas as músicas", count: counts.total },
      {
        value: "missing-chords",
        label: STATUS_LABEL["missing-chords"],
        count: counts.missingChords,
      },
      {
        value: "missing-lyrics",
        label: STATUS_LABEL["missing-lyrics"],
        count: counts.missingLyrics,
      },
      { value: "scheduled", label: STATUS_LABEL.scheduled },
      {
        value: "never",
        label: STATUS_LABEL.never,
        count: counts.neverUsed,
      },
    ];

  return (
    <div className="flex items-center gap-2">
      <InputGroup className="h-11 min-w-0 flex-1 rounded-xl border border-border/80 bg-background shadow-2xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 md:h-10">
        <InputGroupAddon
          align="inline-start"
          className="pl-3 text-muted-foreground"
        >
          <SearchIcon className="size-4" />
        </InputGroupAddon>

        <InputGroupInput
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por título, artista, tom ou tag..."
          className="h-11 text-sm placeholder:text-muted-foreground/70 md:h-10"
        />

        {search ? (
          <InputGroupAddon align="inline-end" className="pr-1">
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <XIcon className="size-4" />
            </button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-11 shrink-0 gap-1.5 rounded-xl px-3 text-sm font-medium md:h-10",
              hasActiveFilters &&
                "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <SlidersHorizontalIcon className="size-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
            <ChevronDownIcon className="size-3 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)] gap-0 p-0"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Filtros</span>
            <button
              type="button"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
              className="text-[11px] font-medium text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar filtros
            </button>
          </div>

          <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
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
                            isSelected
                              ? "text-primary/70"
                              : "text-muted-foreground",
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
        </PopoverContent>
      </Popover>
    </div>
  );
}

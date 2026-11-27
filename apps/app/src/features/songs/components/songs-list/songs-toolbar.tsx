"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  SongsFiltersPanel,
  type SongsFilterStatusOption,
} from "./songs-filters-panel";
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
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const statusOptions: SongsFilterStatusOption[] = [
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

  const filterTriggerButton = (
    <InputGroupButton
      type="button"
      size="sm"
      variant={hasActiveFilters ? "secondary" : "ghost"}
      aria-label="Filtros"
      className={cn(
        "h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-sm font-medium md:h-8",
        hasActiveFilters &&
          "bg-primary/10 text-primary hover:bg-primary/15",
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
    </InputGroupButton>
  );

  return (
    <InputGroup className="h-11 min-w-0 flex-1 rounded-xl bg-background shadow-2xs md:h-10">
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

      <InputGroupAddon align="inline-end" className="gap-1 pr-1.5">
        {search ? (
          <InputGroupButton
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => onSearchChange("")}
            className="size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:size-7"
            title="Limpar busca"
            aria-label="Limpar busca"
          >
            <XIcon className="size-4" />
          </InputGroupButton>
        ) : null}

        {isMobile ? (
          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerTrigger asChild>{filterTriggerButton}</DrawerTrigger>
            <DrawerContent className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl bg-popover p-0">
              <DrawerHeader className="flex-row items-center justify-between border-b border-border/70 px-4 py-3 !text-left">
                <div>
                  <DrawerTitle className="text-sm font-semibold text-foreground">
                    Filtros
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    Filtrar e ordenar músicas do repertório
                  </DrawerDescription>
                </div>
                <button
                  type="button"
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
                  className="min-h-11 px-2 text-xs font-medium text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Limpar filtros
                </button>
              </DrawerHeader>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
                <SongsFiltersPanel
                  toneFilter={toneFilter}
                  onToneFilterChange={onToneFilterChange}
                  statusFilter={statusFilter}
                  onStatusFilterChange={onStatusFilterChange}
                  sortOption={sortOption}
                  onSortOptionChange={onSortOptionChange}
                  statusOptions={statusOptions}
                />
              </div>

              <DrawerFooter className="border-t border-border/70 p-4">
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                  >
                    Fechar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>{filterTriggerButton}</PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 max-w-[calc(100vw-2rem)] gap-0 p-0"
            >
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">
                  Filtros
                </span>
                <button
                  type="button"
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
                  className="text-[11px] font-medium text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Limpar filtros
                </button>
              </div>

              <div className="max-h-[70dvh] overflow-y-auto p-4 [-webkit-overflow-scrolling:touch]">
                <SongsFiltersPanel
                  toneFilter={toneFilter}
                  onToneFilterChange={onToneFilterChange}
                  statusFilter={statusFilter}
                  onStatusFilterChange={onStatusFilterChange}
                  sortOption={sortOption}
                  onSortOptionChange={onSortOptionChange}
                  statusOptions={statusOptions}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
